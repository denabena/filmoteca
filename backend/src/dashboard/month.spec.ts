import { BadRequestException } from '@nestjs/common';
import {
  ACTIVITY_BUCKET_COUNT,
  currentWeekBucket,
  parseMonth,
  previousMonth,
  weekBucketForDay,
} from './month';

const iso = (d: Date) => d.toISOString();

describe('parseMonth', () => {
  it('resolves a key to a half-open UTC range', () => {
    const october = parseMonth('2026-10');

    expect(october.key).toBe('2026-10');
    expect(iso(october.start)).toBe('2026-10-01T00:00:00.000Z');
    expect(iso(october.end)).toBe('2026-11-01T00:00:00.000Z');
  });

  it('rolls December over into the next year', () => {
    expect(iso(parseMonth('2026-12').end)).toBe('2027-01-01T00:00:00.000Z');
  });

  it('falls back to the month containing now', () => {
    expect(parseMonth(undefined, new Date('2026-03-17T12:00:00Z')).key).toBe(
      '2026-03',
    );
    expect(parseMonth('', new Date('2026-03-17T12:00:00Z')).key).toBe(
      '2026-03',
    );
  });

  // The dashboard opens on the current month, so a user in Auckland on the 1st
  // must not be shown the previous month because their local clock says so.
  it('reads now in UTC rather than local time', () => {
    expect(parseMonth(undefined, new Date('2026-04-01T00:30:00Z')).key).toBe(
      '2026-04',
    );
  });

  it.each([
    '2026-13',
    '2026-00',
    '2026',
    'October',
    '26-10',
    '2026-1',
    '2026-10-01',
  ])('rejects %p', (bad) => {
    expect(() => parseMonth(bad)).toThrow(BadRequestException);
  });
});

describe('previousMonth', () => {
  it('steps back one month', () => {
    expect(previousMonth(parseMonth('2026-10')).key).toBe('2026-09');
  });

  it('steps back across a year boundary', () => {
    const december = previousMonth(parseMonth('2026-01'));

    expect(december.key).toBe('2025-12');
    expect(iso(december.start)).toBe('2025-12-01T00:00:00.000Z');
  });
});

describe('weekBucketForDay', () => {
  it.each([
    [1, 0],
    [7, 0],
    [8, 1],
    [14, 1],
    [15, 2],
    [21, 2],
    [22, 3],
    [28, 3],
  ])('puts day %i in bucket %i', (day, bucket) => {
    expect(weekBucketForDay(day)).toBe(bucket);
  });

  // The documented cost of fixed seven-day slices: a 31 day month has a 10 day
  // fourth bar. Clamping is what keeps the chart at four bars.
  it.each([29, 30, 31])(
    'clamps the tail of a long month (day %i) into the last bucket',
    (day) => {
      expect(weekBucketForDay(day)).toBe(ACTIVITY_BUCKET_COUNT - 1);
    },
  );
});

describe('currentWeekBucket', () => {
  it('flags the bucket containing today in the current month', () => {
    expect(
      currentWeekBucket(
        parseMonth('2026-10'),
        new Date('2026-10-17T09:00:00Z'),
      ),
    ).toBe(2);
  });

  it('flags nothing for a past month', () => {
    expect(
      currentWeekBucket(
        parseMonth('2026-09'),
        new Date('2026-10-17T09:00:00Z'),
      ),
    ).toBeNull();
  });

  it('flags nothing for a future month', () => {
    expect(
      currentWeekBucket(
        parseMonth('2026-11'),
        new Date('2026-10-17T09:00:00Z'),
      ),
    ).toBeNull();
  });

  it('includes the first instant of the month and excludes the first of the next', () => {
    const october = parseMonth('2026-10');

    expect(currentWeekBucket(october, new Date('2026-10-01T00:00:00Z'))).toBe(
      0,
    );
    expect(
      currentWeekBucket(october, new Date('2026-11-01T00:00:00Z')),
    ).toBeNull();
  });
});
