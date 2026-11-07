import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ParentPhoneEditor } from './parent-phone-editor';
import { updateFamilyParent } from '@/features/admin-families/admin-families-api';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/features/admin-families/admin-families-api', () => ({ updateFamilyParent: vi.fn().mockResolvedValue(undefined) }));

describe('admin parent phone editor', () => {
  it('submits only the changed phone and shows success', async () => {
    const user = userEvent.setup();
    render(<ParentPhoneEditor familyId="family-1" parentId="parent-1" phoneNumber="09121983207" />);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '09121903207');
    await user.click(screen.getByRole('button', { name: 'ذخیره شماره' }));
    expect(updateFamilyParent).toHaveBeenCalledWith('family-1', 'parent-1', { phoneNumber: '09121903207' });
    expect(await screen.findByRole('status')).toHaveTextContent('شماره ذخیره شد');
  });
});
