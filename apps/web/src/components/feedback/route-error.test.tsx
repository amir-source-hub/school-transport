import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/lib/api-client';
import { RouteError } from './route-error';

describe('RouteError', () => {
  it('focuses recoverable feedback and locks duplicate retries', async () => {
    let finish!: () => void;
    const reset = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(
      <RouteError
        error={new ApiClientError(503, 'SERVICE_UNAVAILABLE', 'technical')}
        reset={reset}
        area="پنل خانواده"
      />,
    );

    const heading = screen.getByRole('heading', { name: 'سرویس موقتاً در دسترس نیست' });
    await waitFor(() => expect(heading).toHaveFocus());
    const retry = screen.getByRole('button', { name: 'تلاش دوباره' });
    await user.dblClick(retry);
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'در حال تلاش…' })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByRole('button', { name: 'تلاش دوباره' })).toBeEnabled());
  });

  it('does not offer retry for access failures', () => {
    render(
      <RouteError error={new ApiClientError(403, 'ACCESS_DENIED', 'technical')} reset={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'دسترسی مجاز نیست' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تلاش دوباره' })).not.toBeInTheDocument();
  });
});
