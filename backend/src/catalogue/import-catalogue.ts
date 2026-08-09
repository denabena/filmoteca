import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CatalogueImportService,
  DEFAULT_PAGES_PER_GENRE,
} from './catalogue-import.service';
import { HttpTmdbClient } from './tmdb.client';

/**
 * CLI entry for the Picker catalogue import: `npm run catalogue:import`.
 *
 * Deliberately thin. Everything worth testing lives in CatalogueImportService and
 * the pure helpers beside it; this only reads config, wires the two together and
 * prints the report.
 *
 * Runs standalone rather than booting Nest. It needs exactly two things, a
 * database and an HTTP client, and starting the whole application to get them
 * would also start an HTTP listener nobody asked for.
 *
 * Pass a page count to override the default: `npm run catalogue:import -- 10`.
 * Each page is 20 results, per genre, per type.
 */
async function main(): Promise<void> {
  const logger = new Logger('CatalogueImport');
  const token = process.env.TMDB_API_READ_TOKEN;

  if (!token) {
    // There is no ConfigModule validationSchema, so this is the only thing
    // standing between a missing token and 20 confusing 401s.
    throw new Error(
      'TMDB_API_READ_TOKEN is not set. Copy backend/.env.example to backend/.env ' +
        'and paste a v4 read access token from themoviedb.org > Settings > API.',
    );
  }

  const pages = Number(process.argv[2] ?? DEFAULT_PAGES_PER_GENRE);

  if (!Number.isInteger(pages) || pages < 1) {
    throw new Error(
      `pages must be a positive integer, got "${process.argv[2]}"`,
    );
  }

  const prisma = new PrismaService();
  const service = new CatalogueImportService(prisma);

  logger.log(`Importing up to ${pages} page(s) per genre per type from TMDB`);

  try {
    const report = await service.import(new HttpTmdbClient(token), pages);
    const skipped = Object.values(report.skipped).reduce((a, b) => a + b, 0);

    logger.log(`imported  ${report.imported} new row(s)`);
    logger.log(`refreshed ${report.updated} row(s) from an earlier run`);
    logger.log(
      `${report.multiGenreTitles} title(s) are filed under more than one genre`,
    );
    logger.log(`skipped   ${skipped} row(s) ${JSON.stringify(report.skipped)}`);
    logger.log(
      report.unmappedGenreIds.length
        ? `unmapped  TMDB genre ids: ${report.unmappedGenreIds.join(', ')}`
        : 'unmapped  TMDB genre ids: none',
    );
    logger.log(`finished in ${(report.durationMs / 1000).toFixed(1)}s`);

    const total = await prisma.catalogueTitle.count();
    logger.log(`catalogue now holds ${total} candidate(s)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
