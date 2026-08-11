import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Genre, type Title } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * A title with its genre row attached.
 *
 * The library table (FIL-45) draws a coloured dot beside a genre name, so a bare
 * `genreId` is not enough and every row would otherwise need a second lookup.
 */
export type TitleWithGenre = Title & { genre: Genre };

/** One genre's share of the owner's library, from `countByGenre` (FIL-43). */
export interface GenreTitleCount {
  genreId: string;
  count: number;
}

/**
 * What a caller may set when creating a title.
 *
 * `userId` is absent by construction: it comes from the verified token, never
 * from a payload. `id` and the timestamps are the server's, per FIL-54 ("its
 * added timestamp is set by the server and cannot be supplied by the caller").
 */
export type CreateTitleData = Omit<
  Prisma.TitleUncheckedCreateInput,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

/** Same exclusions as CreateTitleData: ownership and timestamps are not editable. */
export type UpdateTitleData = Omit<
  Prisma.TitleUncheckedUpdateInput,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

/**
 * The query shapes callers may pass through. `where` is deliberately present but
 * gets the owner merged over it, so a caller can narrow a query but never widen
 * it past their own rows.
 */
export interface ScopedFindManyArgs {
  where?: Prisma.TitleWhereInput;
  orderBy?:
    | Prisma.TitleOrderByWithRelationInput
    | Prisma.TitleOrderByWithRelationInput[];
  include?: Prisma.TitleInclude;
  take?: number;
  skip?: number;
}

/**
 * The one place in the codebase that queries the `titles` table.
 *
 * FIL-14 requires that reads never cross accounts and that the rule is enforced
 * in the data layer rather than repeated in each controller. That is what this
 * class is: every method takes the owner as its first argument and merges it into
 * the query itself, so a feature module physically cannot express an unscoped
 * title query without going around this file.
 *
 * **Do not inject PrismaService to reach `prisma.title` anywhere else.** The
 * guarantee here is only as good as that convention; a single direct query
 * elsewhere reintroduces exactly the leak this exists to prevent.
 *
 * Two details that are load-bearing rather than stylistic:
 *
 * - `userId` is spread **after** the caller's `where`, so passing
 *   `{ where: { userId: 'someone-else' } }` cannot override the owner. Spreading
 *   it first would make the scoping advisory. There is a test for this.
 * - Single-row operations report a row owned by someone else as **404, not 403**,
 *   which is FIL-14's acceptance criterion: a 403 would confirm the row exists
 *   and so disclose another account's data by omission.
 */
@Injectable()
export class TitlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates a title owned by `userId`. Ownership is not negotiable by payload. */
  create(userId: string, data: CreateTitleData): Promise<Title> {
    return this.prisma.title.create({ data: { ...data, userId } });
  }

  /** Lists the owner's titles. Any caller `where` narrows, never widens. */
  findMany(userId: string, args: ScopedFindManyArgs = {}): Promise<Title[]> {
    return this.prisma.title.findMany({
      ...args,
      where: { ...args.where, userId },
    });
  }

  /**
   * As findMany, but with each title's genre row attached (FIL-41).
   *
   * A separate method rather than an `include` passed through findMany, because
   * only the include makes the return type honest: `findMany` is declared to
   * return `Title[]` and an included relation would be present at runtime but
   * invisible to the compiler, which is how a caller ends up reading
   * `title.genre.name` off a type that never promised it.
   */
  findManyWithGenre(
    userId: string,
    args: Omit<ScopedFindManyArgs, 'include'> = {},
  ): Promise<TitleWithGenre[]> {
    return this.prisma.title.findMany({
      ...args,
      where: { ...args.where, userId },
      include: { genre: true },
    });
  }

  /** The owner's first matching title, or null. Used for the dashboard hero. */
  findFirst(
    userId: string,
    args: ScopedFindManyArgs = {},
  ): Promise<Title | null> {
    return this.prisma.title.findFirst({
      ...args,
      where: { ...args.where, userId },
    });
  }

  /**
   * One title by id, or null when it does not exist **or** belongs to someone
   * else. The two cases are deliberately indistinguishable to the caller.
   */
  findById(userId: string, id: string): Promise<Title | null> {
    return this.prisma.title.findFirst({ where: { id, userId } });
  }

  /** As findById, but throws 404 rather than returning null. */
  async findByIdOrThrow(userId: string, id: string): Promise<Title> {
    const title = await this.findById(userId, id);

    if (!title) {
      throw new NotFoundException('Title not found');
    }

    return title;
  }

  /**
   * How many of the owner's titles sit in each genre (FIL-43).
   *
   * One grouped query rather than twelve counts. Empty genres are absent from the
   * result by construction, because `GROUP BY` can only return groups that have a
   * row, which is exactly the "a genre with no titles does not appear" rule: the
   * caller does not filter zeros out, they never arrive.
   *
   * Derived on every read and never stored, so nothing needs invalidating when a
   * title is deleted or its genre changed.
   */
  async countByGenre(userId: string): Promise<GenreTitleCount[]> {
    const groups = await this.prisma.title.groupBy({
      by: ['genreId'],
      where: { userId },
      _count: { _all: true },
    });

    return groups.map((group) => ({
      genreId: group.genreId,
      count: group._count._all,
    }));
  }

  /** Counts the owner's titles. Feeds the Picker unlock rule (FIL-67). */
  count(userId: string, where: Prisma.TitleWhereInput = {}): Promise<number> {
    return this.prisma.title.count({ where: { ...where, userId } });
  }

  /** Updates one of the owner's titles, or throws 404. */
  async update(
    userId: string,
    id: string,
    data: UpdateTitleData,
  ): Promise<Title> {
    await this.assertOwned(userId, id);

    return this.prisma.title.update({ where: { id }, data });
  }

  /** Deletes one of the owner's titles, or throws 404. */
  async delete(userId: string, id: string): Promise<Title> {
    await this.assertOwned(userId, id);

    return this.prisma.title.delete({ where: { id } });
  }

  /**
   * Ownership check ahead of a write.
   *
   * Prisma's `update` and `delete` take only unique fields in `where`, so the
   * owner cannot be folded into the write itself and this is a separate read.
   * The gap between the two queries is not a practical risk: ids are uuids, so
   * they are unguessable, and nothing in the app ever transfers ownership of a
   * row, so what this reads cannot change underneath it.
   */
  private async assertOwned(userId: string, id: string): Promise<void> {
    const owned = await this.prisma.title.count({ where: { id, userId } });

    if (owned === 0) {
      throw new NotFoundException('Title not found');
    }
  }
}
