import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PersistentQueryForm } from './persistent-query-form';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('PersistentQueryForm', () => {
  it('applies filters to the current URL and refreshes data without leaving the page', () => {
    render(<PersistentQueryForm path="/admin/payments"><input name="view" defaultValue="online" />
      <input name="q" defaultValue="محمدی" /><button type="submit">اعمال</button></PersistentQueryForm>);
    fireEvent.click(screen.getByRole('button', { name: 'اعمال' }));
    expect(window.location.search).toContain('q=%D9%85%D8%AD%D9%85%D8%AF%DB%8C');
    expect(refresh).toHaveBeenCalledOnce();
  });
});
