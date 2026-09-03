import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { RouteCatalog } from './route-catalog';
import type { AdminTransportRoute } from './admin-drivers-api';

it('shows readable times, capacity and searchable direction filters', () => {
  const base = { id: 'one', title: 'مسیر فرهنگ', direction: 'TO_SCHOOL', school: { id: 's', name: 'مدرسه فرهنگ' }, driver: { firstName: 'علی', lastName: 'احمدی', capacity: 4 }, students: [{ id: 'p' }], scheduledStartTime: '07:00:00', scheduledArrivalTime: '07:30:00' };
  const { container } = render(<RouteCatalog routes={[base, { ...base, id: 'two', title: 'مسیر پاسداران', direction: 'FROM_SCHOOL' }] as AdminTransportRoute[]} />);
  container.querySelector('details')!.open = true;
  expect(screen.getAllByText('۰۷:۰۰')).toHaveLength(2);
  expect(screen.getAllByText('۳ جای خالی')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'برگشت' }));
  expect(screen.queryByRole('heading', { name: 'مسیر فرهنگ' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'مسیر پاسداران' })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'نام ناموجود' } });
  expect(screen.getByText('مسیری با این جست‌وجو پیدا نشد.')).toBeInTheDocument();
});
