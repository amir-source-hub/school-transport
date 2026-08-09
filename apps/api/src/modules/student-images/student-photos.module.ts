import { Module } from '@nestjs/common';
import {
  AdminStudentPhotosController,
  OnboardingStudentPhotosController,
  StudentPhotosController,
} from './student-photos.controller';
import { StudentPhotosService } from './student-photos.service';
import { OnboardingGuard } from '../access-control/onboarding.guard';

@Module({
  controllers: [
    StudentPhotosController,
    OnboardingStudentPhotosController,
    AdminStudentPhotosController,
  ],
  providers: [StudentPhotosService, OnboardingGuard],
  exports: [StudentPhotosService],
})
export class StudentPhotosModule {}
