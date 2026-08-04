import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Request } from 'express';

/**
 * The subset of the Neon Auth token we rely on. `sub` is the user id and is the
 * value every per-user query scopes by. Everything else is convenience.
 */
export interface NeonAuthUser {
  id: string;
  email?: string;
  name?: string;
  claims: JWTPayload;
}

export interface RequestWithUser extends Request {
  user?: NeonAuthUser;
}

/**
 * Verifies a Neon Auth (Managed Better Auth) session token.
 *
 * Auth itself lives in the Next.js frontend, which owns the sign-in UI and the
 * session cookie. This backend is a separate origin, so it never sees that
 * cookie; the frontend forwards a bearer token and we verify it against Neon's
 * JWKS endpoint. That endpoint is the trust anchor: a signature that validates
 * against it could only have been issued by our own Neon Auth instance.
 */
@Injectable()
export class NeonAuthGuard implements CanActivate {
  private readonly logger = new Logger(NeonAuthGuard.name);

  /**
   * Built on first use, not in the constructor.
   *
   * Reading config eagerly would make constructing this class throw whenever
   * NEON_AUTH_JWKS_URL is absent, and Nest constructs every provider during
   * module init. That makes the whole application unbootable in environments
   * that legitimately lack the variable, CI running the e2e suite among them.
   * Deferring keeps module init side-effect free; a missing variable still fails
   * loudly, just on the first authenticated request instead of at boot.
   *
   * createRemoteJWKSet caches the key set and refetches on rotation, so this is
   * built once per process rather than per request.
   */
  private verifier?: {
    jwks: ReturnType<typeof createRemoteJWKSet>;
    /**
     * Neon Auth issues tokens with `iss` and `aud` both set to the origin of the
     * auth instance, without the `/neondb/auth` path. Deriving it from the JWKS
     * URL keeps this to one environment variable rather than three that could
     * drift out of sync.
     */
    issuer: string;
  };

  constructor(private readonly config: ConfigService) {}

  private getVerifier(): NonNullable<NeonAuthGuard['verifier']> {
    if (this.verifier) return this.verifier;

    const jwksUrl = this.config.get<string>('NEON_AUTH_JWKS_URL');

    if (!jwksUrl) {
      throw new Error(
        'NEON_AUTH_JWKS_URL is not set. Get it from: ' +
          'npx neonctl neon-auth status --project-id <id>',
      );
    }

    this.verifier = {
      jwks: createRemoteJWKSet(new URL(jwksUrl)),
      issuer: new URL(jwksUrl).origin,
    };

    return this.verifier;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const { jwks, issuer } = this.getVerifier();

    try {
      // jose checks exp and nbf as part of verification, so an expired token
      // fails here rather than needing a separate check. Pinning issuer and
      // audience on top means a validly signed token minted for some other
      // service still cannot be replayed against this API.
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience: issuer,
      });

      if (!payload.sub) {
        throw new UnauthorizedException('Token has no subject claim');
      }

      request.user = {
        id: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        name: typeof payload.name === 'string' ? payload.name : undefined,
        claims: payload,
      };

      return true;
    } catch (error) {
      // Log the reason for us, return a bare 401 to the caller. Echoing the
      // verification error back would tell an attacker why their token failed.
      this.logger.warn(
        `Token verification failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractBearerToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;

    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value : undefined;
  }
}
