import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AdminStudentPhotoActions } from './admin-student-photo-actions';
import { rejectAdminPhoto } from './admin-student-photos-api';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('./admin-student-photos-api', () => ({ rejectAdminPhoto: vi.fn() }));
vi.mock('./photo-upload-card', () => ({ PhotoUploadCard: () => null }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange }: { onValueChange: (value: string) => void }) => (
    <button onClick={() => onValueChange('LOW_QUALITY')}>انتخاب دلیل</button>
  ),
}));

describe('approved student photo rejection', () => {
  it('rejects the approved upload and clears the action after success', async () => {
    vi.mocked(rejectAdminPhoto).mockResolvedValue(undefined);
    function Wrapper() {
      const [approved, setApproved] = useState<{ uploadId: string; version: number } | null>({
        uploadId: 'photo-1',
        version: 4,
      });
      return (
        <AdminStudentPhotoActions
          studentId="student-1"
          familyId="family-1"
          approvedPhoto={approved}
          onApprovedPhotoRejected={() => setApproved(null)}
        />
      );
    }
    render(<Wrapper />);
    fireEvent.click(screen.getByText('انتخاب دلیل'));
    fireEvent.click(
      screen.getByRole('button', { name: 'رد عکس تأییدشده و درخواست بارگذاری مجدد' }),
    );
    await waitFor(() =>
      expect(rejectAdminPhoto).toHaveBeenCalledWith('photo-1', 4, 'LOW_QUALITY', ''),
    );
    expect(
      screen.queryByRole('button', { name: 'رد عکس تأییدشده و درخواست بارگذاری مجدد' }),
    ).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });
});
