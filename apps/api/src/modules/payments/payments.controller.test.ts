import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../../common/decorators';
import { AuthGuard } from '../access-control/auth.guard';
import { OnboardingGuard } from '../access-control/onboarding.guard';
import { RolesGuard } from '../access-control/roles.guard';
import {
  AdminPaymentsController,
  OnboardingPaymentsController,
  PaymentsController,
} from './payments.controller';

describe('payment controller authorization contracts', () => {
  it('protects payer and onboarding routes with their respective guards', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, PaymentsController)).toContain(AuthGuard);
    expect(Reflect.getMetadata(GUARDS_METADATA, OnboardingPaymentsController)).toContain(
      OnboardingGuard,
    );
  });

  it('limits destination configuration and receipt review to active admins', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminPaymentsController)).toEqual([
      AuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminPaymentsController)).toEqual(['ADMIN']);
    for (const method of [
      'configureOfflineDestination',
      'offlineSubmissions',
      'approve',
      'reject',
    ] as const) {
      expect(AdminPaymentsController.prototype[method]).toBeTypeOf('function');
    }
  });
});
