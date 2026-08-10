import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { GoalStepper, GOAL_DEFAULT } from './goal-stepper';

// Controlled component, so a tiny stateful harness stands in for the page.
function Harness({ initial = GOAL_DEFAULT }: { initial?: number }) {
  const [value, setValue] = useState(initial);
  return <GoalStepper value={value} onChange={setValue} />;
}

describe('GoalStepper', () => {
  it('starts at the given value and steps up and down by one', async () => {
    render(<Harness />);
    const readout = screen.getByRole('spinbutton', { name: 'Monthly watch goal' });

    expect(readout).toHaveAttribute('aria-valuenow', '15');

    await userEvent.click(screen.getByRole('button', { name: 'Increase goal' }));
    expect(readout).toHaveAttribute('aria-valuenow', '16');

    await userEvent.click(screen.getByRole('button', { name: 'Decrease goal' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decrease goal' }));
    expect(readout).toHaveAttribute('aria-valuenow', '14');
  });

  it('clamps at the minimum and disables the minus button', async () => {
    render(<Harness initial={1} />);
    const readout = screen.getByRole('spinbutton', { name: 'Monthly watch goal' });

    expect(screen.getByRole('button', { name: 'Decrease goal' })).toBeDisabled();
    // Keyboard down does not go below the minimum either.
    readout.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(readout).toHaveAttribute('aria-valuenow', '1');
  });

  it('clamps at the maximum and disables the plus button', async () => {
    render(<Harness initial={99} />);
    const readout = screen.getByRole('spinbutton', { name: 'Monthly watch goal' });

    expect(screen.getByRole('button', { name: 'Increase goal' })).toBeDisabled();
    readout.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(readout).toHaveAttribute('aria-valuenow', '99');
  });

  it('changes the value from the keyboard', async () => {
    render(<Harness />);
    const readout = screen.getByRole('spinbutton', { name: 'Monthly watch goal' });

    readout.focus();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(readout).toHaveAttribute('aria-valuenow', '17');
  });
});
