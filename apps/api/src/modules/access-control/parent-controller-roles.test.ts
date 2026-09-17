import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../../common/decorators';
import { ContractsController } from '../contracts/contracts.controller';
import { DriverAssignmentViewerController } from '../driver-enrollment/driver-enrollment.controller';
import { FamiliesController } from '../families/presentation/families.controller';
import { InstallmentsController } from '../installments/installments.controller';
import { PaymentsController } from '../payments/payments.controller';
import { ParentPricingController } from '../pricing/pricing.controller';
import { RegistrationsController } from '../registrations/registrations.controller';
import { StudentPhotosController } from '../student-images/student-photos.controller';
import { StudentsController } from '../students/students.controller';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';

const parentControllers = [
  FamiliesController,
  StudentsController,
  RegistrationsController,
  ContractsController,
  PaymentsController,
  ParentPricingController,
  InstallmentsController,
  StudentPhotosController,
  DriverAssignmentViewerController,
];

describe('family portal controller authorization', () => {
  it.each(parentControllers.map((controller) => [controller.name, controller] as const))(
    '%s requires authentication and the PARENT role',
    (_name, controller) => {
      expect(Reflect.getMetadata(ROLES_KEY, controller)).toEqual(['PARENT']);
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[];
      expect(guards).toEqual(expect.arrayContaining([AuthGuard, RolesGuard]));
    },
  );
});
