import 'reflect-metadata';

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../../common/decorators';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { AdminNotificationsController, NotificationsController } from './notifications.controller';

describe('notification controller authorization contracts', () => {
  it('protects list, read-one, and read-all behind authentication', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, NotificationsController)).toEqual([AuthGuard]);
    for (const method of ['getAll', 'markRead', 'markAllRead'] as const) {
      expect(NotificationsController.prototype[method]).toBeTypeOf('function');
    }
  });

  it('restricts the shared operational view to ordinary admins', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminNotificationsController)).toEqual([
      AuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminNotificationsController)).toEqual(['ADMIN']);
  });
});
