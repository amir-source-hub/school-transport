import { Module } from '@nestjs/common';
import { OnboardingGuard } from '../access-control/onboarding.guard';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { AdminDriversController, DriverAssignmentViewerController, DriverDocumentsController, DriverEnrollmentController, DriverPortalController } from './driver-enrollment.controller';
import { DriverEnrollmentService } from './driver-enrollment.service';

@Module({
  controllers: [DriverEnrollmentController, DriverDocumentsController, DriverPortalController, AdminDriversController, DriverAssignmentViewerController],
  providers: [DriverEnrollmentService, OnboardingGuard, AuthGuard, RolesGuard],
})
export class DriverEnrollmentModule {}
