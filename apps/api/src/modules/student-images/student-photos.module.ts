import { Module } from '@nestjs/common';
import { AdminStudentPhotosController, StudentPhotosController } from './student-photos.controller';
import { StudentPhotosService } from './student-photos.service';

@Module({
  controllers: [StudentPhotosController, AdminStudentPhotosController],
  providers: [StudentPhotosService],
  exports: [StudentPhotosService],
})
export class StudentPhotosModule {}
