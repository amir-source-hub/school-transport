import { Controller, Delete, Get, Post, Patch, Body, UseGuards, Req, Param } from '@nestjs/common';
import { FamiliesService } from '../application/families.service';
import { AuthGuard } from '../../access-control/auth.guard';
import { successResponse } from '../../../common/response';
import { CreateFamilyDto } from '../domain/family.types';
import { Roles } from '../../../common/decorators';
import { RolesGuard } from '../../access-control/roles.guard';

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
    @Body()
    dto: {
      firstName?: string;
      lastName?: string;
      nationalId?: string;
      phoneNumber?: string;
      parentType?: string;
    },
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

  @Patch('emergency-contacts/:contactId')
  async updateEmergencyContact(
    @Req() req: any,
    @Param('contactId') contactId: string,
    @Body()
    dto: { firstName?: string; lastName?: string; relationship?: string; phoneNumber?: string },
  ) {
    await this.familiesService.updateEmergencyContact(contactId, req.user.id, dto);
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
    return successResponse({
      updated: true,
      message: 'Primary phone changed. OTP verification required.',
    });
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/families')
export class AdminFamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Get()
  async getAll() {
    return successResponse(await this.familiesService.getAllForAdmin());
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return successResponse(await this.familiesService.getForAdmin(id));
  }

  @Post(':id/parents')
  async createParent(@Param('id') id: string, @Body() dto: any) {
    return successResponse(await this.familiesService.adminCreateParent(id, dto));
  }

  @Patch(':id/parents/:parentId')
  async updateParent(
    @Param('id') id: string,
    @Param('parentId') parentId: string,
    @Body() dto: any,
  ) {
    return successResponse(await this.familiesService.adminUpdateParent(id, parentId, dto));
  }

  @Delete(':id/parents/:parentId')
  async deleteParent(@Param('id') id: string, @Param('parentId') parentId: string) {
    return successResponse(await this.familiesService.adminDeleteParent(id, parentId));
  }
}
