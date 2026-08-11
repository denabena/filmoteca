import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // This repo has a package-lock.json at the root (repo-wide dev tooling) and one
  // per app, so Turbopack cannot infer the workspace root and falls back to the
  // repo root. That makes it watch and trace backend/ too. Pin the root to this
  // app: there are no npm workspaces, each app has its own node_modules, and the
  // frontend resolves nothing from outside this directory.
  turbopack: {
    root: __dirname,
  },
  // Externalise only `jose`: require it from node_modules at runtime rather than
  // bundling it. Turbopack otherwise pulls jose's `webapi` ESM build into the RSC
  // graph and mis-analyses it ("export unprotected doesn't exist"), breaking every
  // server route that reads the session. `@neondatabase/auth` and `better-auth`
  // must stay bundled - they import Next internals like `next/headers`, which only
  // resolve inside the bundle - so only jose is external here.
  serverExternalPackages: ['jose'],
};

export default nextConfig;
