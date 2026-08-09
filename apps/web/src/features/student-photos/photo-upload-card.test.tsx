import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PhotoUploadCard } from './photo-upload-card';
import type { PhotoUploadView } from './student-photos-api';

const authorizePhotoUpload = vi.hoisted(() => vi.fn());
const putPhotoObject = vi.hoisted(() => vi.fn());
const completePhotoUpload = vi.hoisted(() => vi.fn());
const getMyPhotoUploads = vi.hoisted(() => vi.fn());
const getPhotoViewUrl = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock('./student-photos-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./student-photos-api')>();
  return {
    ...original,
    authorizePhotoUpload,
    putPhotoObject,
    completePhotoUpload,
    getMyPhotoUploads,
    getPhotoViewUrl,
  };
});

function upload(overrides: Record<string, unknown> = {}): PhotoUploadView {
  return {
    uploadId: 'upload-1',
    studentId: 'student-1',
    status: 'PENDING_REVIEW',
    rejectionCode: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as unknown as PhotoUploadView;
}

function pngFile(size = 10_000) {
  return new File([new Uint8Array(size)], 'photo.png', { type: 'image/png' });
}

describe('PhotoUploadCard', () => {
  it('renders the Persian status of each provided upload', () => {
    render(
      <PhotoUploadCard
        studentId="student-1"
        initialItems={[upload(), upload({ status: 'APPROVED' }), upload({ status: 'REJECTED' })]}
      />,
    );

    expect(screen.getByText('در انتظار تایید')).toBeInTheDocument();
    expect(screen.getByText('تایید شده')).toBeInTheDocument();
    expect(screen.getByText('رد شده')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /مشاهده عکس/ })).toBeInTheDocument();
  });

  it('rejects an unsupported file format with a friendly message', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<PhotoUploadCard studentId="student-1" initialItems={[]} />);

    await user.upload(
      screen.getByLabelText(/انتخاب عکس/),
      new File(['x'], 'notes.txt', { type: 'text/plain' }),
    );

    expect(await screen.findByText(/فقط تصویر JPG یا PNG/)).toBeInTheDocument();
    expect(authorizePhotoUpload).not.toHaveBeenCalled();
  });

  it('rejects a file larger than 25 MB without calling the API', async () => {
    const user = userEvent.setup();
    render(<PhotoUploadCard studentId="student-1" initialItems={[]} />);

    await user.upload(screen.getByLabelText(/انتخاب عکس/), pngFile(26 * 1024 * 1024));

    expect(await screen.findByText(/۲۵ مگابایت بیشتر/)).toBeInTheDocument();
    expect(authorizePhotoUpload).not.toHaveBeenCalled();
  });

  it('authorizes, uploads to storage, completes, and refreshes the list', async () => {
    authorizePhotoUpload.mockResolvedValue({
      uploadId: 'upload-9',
      objectKey: 'student-photos/raw/raw-9.png',
      uploadUrl: 'https://s3.example/put-url',
      expiresInSeconds: 300,
      acceptedFormats: ['image/jpeg', 'image/png'],
      maxBytes: 25 * 1024 * 1024,
      status: 'AUTHORIZED',
    });
    putPhotoObject.mockResolvedValue(undefined);
    completePhotoUpload.mockResolvedValue(upload({ uploadId: 'upload-9', status: 'PENDING_REVIEW' }));
    getMyPhotoUploads.mockResolvedValue([upload({ uploadId: 'upload-9' })]);

    const user = userEvent.setup();
    render(<PhotoUploadCard studentId="student-1" initialItems={[]} />);

    await user.upload(screen.getByLabelText(/انتخاب عکس/), pngFile());

    await waitFor(() => expect(authorizePhotoUpload).toHaveBeenCalledWith({
      studentId: 'student-1',
      declaredMime: 'image/png',
      declaredSize: 10_000,
    }));
    await waitFor(() => expect(putPhotoObject).toHaveBeenCalledWith('https://s3.example/put-url', expect.any(File)));
    await waitFor(() => expect(completePhotoUpload).toHaveBeenCalledWith('upload-9'));
    expect(await screen.findByText(/در صف بررسی قرار گرفت/)).toBeInTheDocument();
    expect(screen.getByText('در انتظار تایید')).toBeInTheDocument();
  });

  it('reports a storage failure without completing the upload', async () => {
    authorizePhotoUpload.mockResolvedValue({
      uploadId: 'upload-9',
      objectKey: 'key',
      uploadUrl: 'https://s3.example/put-url',
      expiresInSeconds: 300,
      acceptedFormats: ['image/jpeg', 'image/png'],
      maxBytes: 25 * 1024 * 1024,
      status: 'AUTHORIZED',
    });
    putPhotoObject.mockRejectedValue(new Error('PHOTO_UPLOAD_HTTP_500'));

    const user = userEvent.setup();
    render(<PhotoUploadCard studentId="student-1" initialItems={[]} />);

    await user.upload(screen.getByLabelText(/انتخاب عکس/), pngFile());

    expect(await screen.findByRole('status')).toHaveTextContent(/ارسال فایل به ذخیره‌گاه ناموفق بود/);
    expect(completePhotoUpload).not.toHaveBeenCalled();
  });
});
