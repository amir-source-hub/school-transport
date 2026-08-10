import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
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
});
