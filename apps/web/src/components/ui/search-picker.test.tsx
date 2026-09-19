import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchPicker } from './search-picker';

describe('SearchPicker', () => {
  it('filters on each character and selects with the keyboard', () => {
    const change = vi.fn();
    render(
      <SearchPicker
        label="مسیر"
        value=""
        onChange={change}
        options={[
          { value: 'a', label: 'مسیر فرهنگ' },
          { value: 'b', label: 'مسیر پاسداران' },
        ]}
      />,
    );
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'پ' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(change).toHaveBeenLastCalledWith('b');
  });
  it('does not select full routes', () => {
    const change = vi.fn();
    render(
      <SearchPicker
        label="مسیر"
        value=""
        onChange={change}
        options={[{ value: 'a', label: 'مسیر پر', disabled: true, reason: 'ظرفیت تکمیل' }]}
      />,
    );
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option'));
    expect(change).not.toHaveBeenCalled();
  });
  it('searches remotely while typing without a separate search button', async () => {
    const load = vi.fn().mockResolvedValue([{ value: 's', label: 'باران' }]);
    render(
      <SearchPicker
        label="دانش‌آموز"
        value=""
        onChange={vi.fn()}
        options={[]}
        loadOptions={load}
      />,
    );
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ب' } });
    await waitFor(() => expect(load).toHaveBeenCalledWith('ب'));
    expect(await screen.findByRole('option', { name: 'باران' })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'با' } });
    await waitFor(() => expect(load).toHaveBeenCalledWith('با'));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows textual direction badges as well as color for assigned students', () => {
    render(
      <SearchPicker
        label="دانش‌آموز"
        value=""
        onChange={vi.fn()}
        options={[
          { value: 'out', label: 'دانش‌آموز رفت', assignment: 'TO_SCHOOL' },
          { value: 'back', label: 'دانش‌آموز برگشت', assignment: 'FROM_SCHOOL' },
          { value: 'both', label: 'دانش‌آموز هر دو', assignment: 'BOTH' },
          { value: 'new', label: 'دانش‌آموز جدید' },
        ]}
      />,
    );
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'دانش‌آموز رفت رفت' })).toHaveClass('bg-emerald-50');
    expect(screen.getByRole('option', { name: 'دانش‌آموز برگشت برگشت' })).toHaveClass(
      'bg-amber-50',
    );
    expect(screen.getByRole('option', { name: 'دانش‌آموز هر دو رفت برگشت' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'دانش‌آموز جدید' })).not.toHaveClass('bg-emerald-50');
  });

  it('refreshes assignment badges when the selected route changes', () => {
    const props = { label: 'دانش‌آموز', value: '', onChange: vi.fn() };
    const { rerender } = render(
      <SearchPicker
        {...props}
        options={[{ value: 'student', label: 'سارا', assignment: 'TO_SCHOOL' }]}
      />,
    );
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'سارا رفت' })).toBeInTheDocument();
    rerender(
      <SearchPicker
        {...props}
        options={[{ value: 'student', label: 'سارا', assignment: 'FROM_SCHOOL' }]}
      />,
    );
    expect(screen.getByRole('option', { name: 'سارا برگشت' })).toHaveClass('bg-amber-50');
  });
});
