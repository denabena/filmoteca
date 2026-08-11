import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalStepPage from './page';

// useRouter is stubbed: jsdom has no App Router context, and the test only needs
// to assert where Back/Continue navigate.
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function mockFetch(impl: (url: string, init?: RequestInit) => Partial<Response>) {
  global.fetch = jest.fn((url: string, init?: RequestInit) =>
    Promise.resolve(impl(url, init) as Response),
  ) as unknown as typeof fetch;
}

describe('GoalStepPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('prefills the stepper with the persisted goal', async () => {
    mockFetch(() => ({ ok: true, json: async () => ({ monthlyWatchGoal: 22 }) }));

    render(<GoalStepPage />);

    await waitFor(() => expect(screen.getByText('22')).toBeInTheDocument());
  });

  it('saves the goal and opens the genres step on Continue', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    mockFetch((url, init) => {
      calls.push({ url, init });
      return { ok: true, json: async () => ({ monthlyWatchGoal: 15 }) };
    });

    render(<GoalStepPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/onboarding/genres'));
    const patch = calls.find((c) => c.init?.method === 'PATCH');
    expect(patch?.url).toBe('/api/profile');
    expect(JSON.parse(patch?.init?.body as string)).toEqual({ monthlyWatchGoal: 15 });
  });

  it('persists the goal and returns to Welcome on Back', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    mockFetch((url, init) => {
      calls.push({ url, init });
      return { ok: true, json: async () => ({ monthlyWatchGoal: 15 }) };
    });

    render(<GoalStepPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    // Navigation happens immediately; the save is fire-and-forget so the value
    // entered here survives the Welcome round trip and is re-read on return.
    expect(mockPush).toHaveBeenCalledWith('/welcome');
    await waitFor(() => expect(calls.some((c) => c.init?.method === 'PATCH')).toBe(true));
  });

  it('stays on the step and shows the failure when the save fails', async () => {
    mockFetch((_url, init) =>
      init?.method === 'PATCH'
        ? { ok: false, json: async () => ({}) }
        : { ok: true, json: async () => ({ monthlyWatchGoal: 15 }) },
    );

    render(<GoalStepPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save your goal/i);
    expect(mockPush).not.toHaveBeenCalledWith('/onboarding/genres');
  });
});
