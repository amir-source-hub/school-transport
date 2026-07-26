import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { AdminPricingController, ParentPricingController } from './pricing.controller';

@Module({
  controllers: [AdminPricingController, ParentPricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
