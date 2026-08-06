import { Controller, Delete, Get, Post, Patch, Body, UseGuards, Req, Param, ParseUUIDPipe } from '@nestjs/common';
import { FamiliesService } from '../application/families.service';
import { AuthGuard } from '../../access-control/auth.guard';
import { successResponse } from '../../../common/response';
import { Roles } from '../../../common/decorators';
import { RolesGuard } from '../../access-control/roles.guard';
import { AuthenticatedRequest } from '../../../common/http-request';
import { AddAddressDto, AddressMutationDto, AdminCreateParentDto, AdminUpdateParentDto, CompleteFamilyDto, EmergencyMutationDto, ParentTypeDto, UpdateProfileDto } from './family.dto';

@UseGuards(AuthGuard)
@Controller('families')
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Post('complete-registration')
  async completeRegistration(@Req() req: AuthenticatedRequest, @Body() dto: CompleteFamilyDto) {
    const profile = await this.familiesService.createFamily(req.user.id, dto);
    return successResponse(profile);
  }

  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const profile = await this.familiesService.getFamilyProfile(req.user.id);
    return successResponse(profile);
  }

  @Patch('me')
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    await this.familiesService.updateProfile(req.user.id, dto);
    return successResponse({ updated: true });
  }

  @Post('addresses')
  async addAddress(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddAddressDto,
  ) {
    const address = await this.familiesService.addAddress(req.user.id, dto);
    return successResponse(address);
  }

  @Patch('addresses/:addressId')
  async updateAddress(@Req() req: AuthenticatedRequest, @Param('addressId', new ParseUUIDPipe()) addressId: string, @Body() dto: AddressMutationDto) {
    await this.familiesService.updateAddress(addressId, req.user.id, { ...dto });
    return successResponse({ updated: true });
  }

  @Patch('emergency-contacts/:contactId')
  async updateEmergencyContact(
    @Req() req: AuthenticatedRequest,
    @Param('contactId', new ParseUUIDPipe()) contactId: string,
    @Body() dto: EmergencyMutationDto,
  ) {
    await this.familiesService.updateEmergencyContact(contactId, req.user.id, dto);
    return successResponse({ updated: true });
  }

  @Post('set-primary-phone')
  async setPrimaryPhone(@Req() req: AuthenticatedRequest, @Body() dto: ParentTypeDto) {
    await this.familiesService.setPrimaryPhone(req.user.id, dto.parentType);
    return successResponse({ updated: true });
  }

  @Post('change-primary-phone')
  async changePrimaryPhone(@Req() req: AuthenticatedRequest, @Body() dto: ParentTypeDto) {
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
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return successResponse(await this.familiesService.getForAdmin(id));
  }

  @Post(':id/parents')
  async createParent(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AdminCreateParentDto) {
    return successResponse(await this.familiesService.adminCreateParent(id, dto));
  }

  @Patch(':id/parents/:parentId')
  async updateParent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('parentId', new ParseUUIDPipe()) parentId: string,
    @Body() dto: AdminUpdateParentDto,
  ) {
    return successResponse(await this.familiesService.adminUpdateParent(id, parentId, dto));
  }

  @Delete(':id/parents/:parentId')
  async deleteParent(@Param('id', new ParseUUIDPipe()) id: string, @Param('parentId', new ParseUUIDPipe()) parentId: string) {
    return successResponse(await this.familiesService.adminDeleteParent(id, parentId));
  }
}
