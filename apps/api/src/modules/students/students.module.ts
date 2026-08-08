import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController, AdminStudentsController } from './students.controller';
import { SuperAdminGuard } from '../access-control/super-admin.guard';

@Module({
  controllers: [StudentsController, AdminStudentsController],
  providers: [StudentsService, SuperAdminGuard],
  exports: [StudentsService],
})
export class StudentsModule {}
