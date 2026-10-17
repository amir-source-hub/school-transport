import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { ROLES_KEY } from '../../common/decorators';
import { AuthGuard } from '../access-control/auth.guard';
import { OnboardingGuard } from '../access-control/onboarding.guard';
import { RolesGuard } from '../access-control/roles.guard';
import {
  AdminStudentPhotosController,
  OnboardingStudentPhotosController,
  StudentPhotosController,
} from './student-photos.controller';

describe('student photo controller authorization', () => {
  it('separates account, onboarding, and ordinary-admin boundaries', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, StudentPhotosController)).toContain(AuthGuard);
    expect(Reflect.getMetadata(GUARDS_METADATA, OnboardingStudentPhotosController)).toContain(
      OnboardingGuard,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminStudentPhotosController)).toEqual([
      AuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminStudentPhotosController)).toEqual(['ADMIN']);
  });

  it('creates onboarding photo evidence under the selected family account for an admin', async () => {
    const authorizeUpload = vi.fn(async () => ({ uploadId: 'upload-1' }));
    const controller = new AdminStudentPhotosController({ authorizeUpload } as never);
    const request = { user: { id: 'admin-1' }, ip: '127.0.0.1' } as never;
    const body = { declaredMime: 'image/png' as const, declaredSize: 1234 };

    await controller.authorizeForFamily(request, 'family-1', body);

    expect(authorizeUpload).toHaveBeenCalledWith('family-1', body, '127.0.0.1');
  });

  it('keeps a new-student photo pending until enrollment links it to the student', async () => {
    const completed = { uploadId: 'upload-1', status: 'PENDING_REVIEW', version: 2 };
    const completeUpload = vi.fn(async () => completed);
    const approve = vi.fn();
    const controller = new AdminStudentPhotosController({ completeUpload, approve } as never);
    const request = { user: { id: 'admin-1' }, ip: '127.0.0.1' } as never;

    const response = await controller.completeForFamily(request, 'family-1', 'upload-1');

    expect(completeUpload).toHaveBeenCalledWith('family-1', 'upload-1', '127.0.0.1');
    expect(approve).not.toHaveBeenCalled();
    expect(response.data).toEqual(completed);
  });
});
