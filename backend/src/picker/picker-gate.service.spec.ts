import { Test, TestingModule } from '@nestjs/testing';
import { TitlesRepository } from '../titles/titles.repository';
import {
  PICKER_UNLOCK_THRESHOLD,
  PickerGateService,
} from './picker-gate.service';

const USER = 'neon-user-123';

describe('PickerGateService', () => {
  const count = jest.fn();

  let gate: PickerGateService;

  beforeEach(async () => {
    count.mockReset().mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PickerGateService,
        { provide: TitlesRepository, useValue: { count } },
      ],
    }).compile();

    gate = module.get(PickerGateService);
  });

  it('counts only rated titles, scoped to the user', async () => {
    await gate.getState(USER);

    expect(count).toHaveBeenCalledWith(USER, { rating: { not: null } });
  });

  // The boundary is the whole ticket, so it is asserted either side and on it.
  it.each([
    [0, false],
    [1, false],
    [2, false],
    [3, true],
    [4, true],
    [40, true],
  ])('with %i rated titles, unlocked is %p', async (ratedCount, unlocked) => {
    count.mockResolvedValue(ratedCount);

    await expect(gate.getState(USER)).resolves.toEqual({
      unlocked,
      ratedCount,
      threshold: PICKER_UNLOCK_THRESHOLD,
    });
  });

  it('proposes three, which A27 leaves undecided', () => {
    expect(PICKER_UNLOCK_THRESHOLD).toBe(3);
  });

  // Derived on every read rather than stored, so deleting a rated title re-locks
  // the Picker without any invalidation hook on the delete path.
  it('re-locks when the count falls back below the threshold', async () => {
    count.mockResolvedValue(3);
    await expect(gate.getState(USER)).resolves.toMatchObject({
      unlocked: true,
    });

    count.mockResolvedValue(2);
    await expect(gate.getState(USER)).resolves.toMatchObject({
      unlocked: false,
    });
  });

  // Frame 16 says "titles", frame 05 says "added and rated". The stricter reading
  // wins, so adding without rating must not move the gate.
  it('does not count titles that are added but unrated', async () => {
    // Ten titles in the library, none rated: the scoped count returns 0.
    count.mockResolvedValue(0);

    await expect(gate.getState(USER)).resolves.toMatchObject({
      unlocked: false,
      ratedCount: 0,
    });
  });
});
