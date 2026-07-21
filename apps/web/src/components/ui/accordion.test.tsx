import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Accordion } from '@/components/ui/accordion';

describe('Accordion', () => {
  it('reveals content through keyboard-accessible interaction', async () => {
    const user = userEvent.setup();
    render(
      <Accordion
        items={[
          {
            value: 'registration',
            title: 'ثبت‌نام چگونه انجام می‌شود؟',
            content: 'درخواست را ثبت و وضعیت آن را پیگیری کنید.',
          },
        ]}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'ثبت‌نام چگونه انجام می‌شود؟' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    trigger.focus();
    await user.keyboard('{Enter}');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('درخواست را ثبت و وضعیت آن را پیگیری کنید.')).toBeVisible();
  });
});
