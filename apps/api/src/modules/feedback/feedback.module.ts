import { Module } from '@nestjs/common';
import { AdminFeedbackController, FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
@Module({
  controllers: [FeedbackController, AdminFeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
