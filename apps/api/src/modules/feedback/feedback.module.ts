import { Module } from '@nestjs/common';
import {
  AdminFeedbackController,
  FeedbackController,
  ManagerFeedbackController,
} from './feedback.controller';
import { SchoolManagerScopeService } from '../access-control/school-manager-scope.service';
import { FeedbackService } from './feedback.service';
@Module({
  controllers: [FeedbackController, AdminFeedbackController, ManagerFeedbackController],
  providers: [FeedbackService, SchoolManagerScopeService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
