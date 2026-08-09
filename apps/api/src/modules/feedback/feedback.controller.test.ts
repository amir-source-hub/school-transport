import 'reflect-metadata';

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../../common/decorators';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { AdminFeedbackController, FeedbackController } from './feedback.controller';

describe('feedback controller authorization contracts', () => {
  it('requires authentication for student feedback operations', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, FeedbackController)).toContain(AuthGuard);
  });

  it('requires an ordinary active ADMIN role for every admin feedback operation', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminFeedbackController)).toEqual([
      AuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminFeedbackController)).toEqual(['ADMIN']);
    for (const method of ['list', 'read', 'assign', 'respond', 'close'] as const) {
      expect(AdminFeedbackController.prototype[method]).toBeTypeOf('function');
    }
  });
});
