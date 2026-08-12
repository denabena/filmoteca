import type { Genre, Title } from '@prisma/client';

/**
 * An in-memory stand-in for `prisma.title`, for tests that have to read a derived
 * view **after** a write and see it settle.
 *
 * Everything else in this codebase asserts query shape, which is right for
 * proving that the owner is in the `where`. It cannot prove FIL-56's real
 * criteria: "the genre no longer appears", "the Picker returns to its locked
 * state", "the hero picks the next candidate". Those are statements about two
 * reads either side of a delete, and a mock that returns a fixed array cannot
 * make them. Stubbing the second read to return what you hoped for is a test of
 * the stub.
 *
 * So this implements the slice of the Prisma title API the derived readers
 * actually use, and no more. It is deliberately not a Prisma emulator: unknown
 * `where` keys throw rather than being ignored, so a query this cannot honestly
 * answer fails loudly instead of quietly passing a test.
 *
 * CI has no database, which is why this exists rather than a real one.
 */

type Row = Title & { genre?: Genre };

interface WhereInput {
  id?: string;
  userId?: string;
  status?: Title['status'];
  genreId?: string;
  rating?: { not: null };
  watchDate?: { gte?: Date; lt?: Date; not?: null };
}

type Direction = 'asc' | 'desc';
type OrderBy = Record<string, Direction>;

interface FindManyArgs {
  where?: WhereInput;
  orderBy?: OrderBy | OrderBy[];
  include?: { genre?: boolean };
  take?: number;
  skip?: number;
}

const KNOWN_WHERE_KEYS = new Set([
  'id',
  'userId',
  'status',
  'genreId',
  'rating',
  'watchDate',
  'name',
]);

export class FakeTitleTable {
  constructor(
    private rows: Row[],
    private readonly genres: Record<string, Genre>,
  ) {}

  /** Rows currently stored, for asserting on the write itself. */
  all(): Row[] {
    return this.rows;
  }

  findMany = (args: FindManyArgs = {}): Promise<Row[]> => {
    let matched = this.rows.filter((row) => matches(row, args.where));

    for (const clause of [args.orderBy ?? []].flat().reverse()) {
      const [field, direction] = Object.entries(clause)[0];
      matched = [...matched].sort((a, b) =>
        compare(a[field as keyof Row], b[field as keyof Row], direction),
      );
    }

    if (args.skip) matched = matched.slice(args.skip);
    if (args.take !== undefined) matched = matched.slice(0, args.take);

    return Promise.resolve(
      matched.map((row) =>
        args.include?.genre ? { ...row, genre: this.genres[row.genreId] } : row,
      ),
    );
  };

  findFirst = async (args: FindManyArgs = {}): Promise<Row | null> => {
    const [first] = await this.findMany({ ...args, take: 1 });
    return first ?? null;
  };

  count = ({ where }: { where?: WhereInput } = {}): Promise<number> =>
    Promise.resolve(this.rows.filter((row) => matches(row, where)).length);

  groupBy = ({
    where,
  }: {
    by: ['genreId'];
    where?: WhereInput;
    _count: { _all: true };
  }): Promise<{ genreId: string; _count: { _all: number } }[]> => {
    const counts = new Map<string, number>();

    for (const row of this.rows.filter((candidate) =>
      matches(candidate, where),
    )) {
      counts.set(row.genreId, (counts.get(row.genreId) ?? 0) + 1);
    }

    return Promise.resolve(
      [...counts].map(([genreId, count]) => ({
        genreId,
        _count: { _all: count },
      })),
    );
  };

  update = ({
    where,
    data,
  }: {
    where: { id: string };
    data: Partial<Title>;
  }): Promise<Row> => {
    const row = this.rows.find((candidate) => candidate.id === where.id);
    if (!row) throw new Error(`no such row ${where.id}`);

    Object.assign(row, data);
    return Promise.resolve(row);
  };

  delete = ({ where }: { where: { id: string } }): Promise<Row> => {
    const row = this.rows.find((candidate) => candidate.id === where.id);
    if (!row) throw new Error(`no such row ${where.id}`);

    this.rows = this.rows.filter((candidate) => candidate.id !== where.id);
    return Promise.resolve(row);
  };
}

function matches(row: Row, where: WhereInput = {}): boolean {
  for (const key of Object.keys(where)) {
    if (!KNOWN_WHERE_KEYS.has(key)) {
      throw new Error(
        `FakeTitleTable cannot honour the filter "${key}". Teach it that key rather than letting the query pass unfiltered.`,
      );
    }
  }

  if (where.id !== undefined && row.id !== where.id) return false;
  if (where.userId !== undefined && row.userId !== where.userId) return false;
  if (where.status !== undefined && row.status !== where.status) return false;
  if (where.genreId !== undefined && row.genreId !== where.genreId)
    return false;
  if (where.rating?.not === null && row.rating === null) return false;

  if (where.watchDate) {
    if (where.watchDate.not === null && row.watchDate === null) return false;
    if (where.watchDate.gte || where.watchDate.lt) {
      if (!row.watchDate) return false;
      if (where.watchDate.gte && row.watchDate < where.watchDate.gte)
        return false;
      if (where.watchDate.lt && row.watchDate >= where.watchDate.lt)
        return false;
    }
  }

  return true;
}

function compare(a: unknown, b: unknown, direction: Direction): number {
  const order =
    a === b
      ? 0
      : a === null
        ? -1
        : b === null
          ? 1
          : (a as number) < (b as number)
            ? -1
            : 1;

  return direction === 'desc' ? -order : order;
}
