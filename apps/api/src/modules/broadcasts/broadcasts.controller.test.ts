import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../../common/decorators';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { BroadcastsController } from './broadcasts.controller';

describe('bulk SMS controller authorization', () => {
  it('requires an active ordinary ADMIN role for every campaign operation', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, BroadcastsController)).toEqual([
      AuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, BroadcastsController)).toEqual(['ADMIN']);
    for (const method of [
      'list',
      'preview',
      'create',
      'approve',
      'test',
      'pause',
      'resume',
      'cancel',
    ] as const) {
      expect(BroadcastsController.prototype[method]).toBeTypeOf('function');
    }
  });
});
