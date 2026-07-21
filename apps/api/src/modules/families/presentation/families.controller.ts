import { Controller, Get, Post, Patch, Body, UseGuards, Req, Param } from '@nestjs/common';
import { FamiliesService } from '../application/families.service';
import { AuthGuard } from '../../access-control/auth.guard';
import { successResponse } from '../../../common/response';
import { CreateFamilyDto } from '../domain/family.types';

@UseGuards(AuthGuard)
@Controller('families')
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Post('complete-registration')
  async completeRegistration(@Req() req: any, @Body() dto: CreateFamilyDto) {
    const profile = await this.familiesService.createFamily(req.user.id, dto);
    return successResponse(profile);
  }

  @Get('me')
  async getProfile(@Req() req: any) {
    const profile = await this.familiesService.getFamilyProfile(req.user.id);
    return successResponse(profile);
  }

  @Patch('me')
  async updateProfile(
    @Req() req: any,
    @Body() dto: { firstName?: string; lastName?: string; parentType?: string },
  ) {
    await this.familiesService.updateProfile(req.user.id, dto);
    return successResponse({ updated: true });
  }

  @Post('addresses')
  async addAddress(
    @Req() req: any,
    @Body()
    dto: {
      title: string;
      province: string;
      city: string;
      district?: string;
      streetAddress: string;
      postalCode?: string;
    },
  ) {
    const address = await this.familiesService.addAddress(req.user.id, dto);
    return successResponse(address);
  }

  @Patch('addresses/:addressId')
  async updateAddress(@Req() req: any, @Param('addressId') addressId: string, @Body() dto: any) {
    await this.familiesService.updateAddress(addressId, req.user.id, dto);
    return successResponse({ updated: true });
  }

  @Post('set-primary-phone')
  async setPrimaryPhone(@Req() req: any, @Body() dto: { parentType: 'MOTHER' | 'FATHER' }) {
    await this.familiesService.setPrimaryPhone(req.user.id, dto.parentType);
    return successResponse({ updated: true });
  }

  @Post('change-primary-phone')
  async changePrimaryPhone(@Req() req: any, @Body() dto: { parentType: 'MOTHER' | 'FATHER' }) {
    await this.familiesService.setPrimaryPhone(req.user.id, dto.parentType);
    const profile = await this.familiesService.getFamilyProfile(req.user.id);
    return successResponse({
      updated: true,
      message: 'Primary phone changed. OTP verification required.',
    });
  }

  @Post('change-password')
  async changePassword(@Req() req: any, @Body() dto: { oldPassword: string; newPassword: string }) {
    return { message: 'Use POST /auth/change-password instead.' };
  }
}
