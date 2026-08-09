import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController, AdminStudentsController } from './students.controller';

@Module({
  controllers: [StudentsController, AdminStudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
