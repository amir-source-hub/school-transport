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
});
