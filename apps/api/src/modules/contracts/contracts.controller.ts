import { Body, Controller, Get, Post, Param, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { AuthGuard } from '../access-control/auth.guard';
import { OnboardingGuard } from '../access-control/onboarding.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';
import { AuthenticatedRequest } from '../../common/http-request';

@UseGuards(AuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  async getAll(@Req() req: AuthenticatedRequest) {
    const list = await this.contractsService.getByFamily(req.user.id);
    return successResponse(list);
  }

  @Get(':id')
  async getById(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    const contract = await this.contractsService.getDetails(id, req.user.id);
    return successResponse(contract);
  }

  @Post(':id/accept')
  async accept(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { reviewedPages?: number[]; templateHash?: string },
  ) {
    const contract = await this.contractsService.accept(id, req.user.id, {
      ...body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return successResponse(contract);
  }

  @Post(':id/reject')
  async reject(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    const contract = await this.contractsService.reject(id, req.user.id);
    return successResponse(contract);
  }
}

@UseGuards(OnboardingGuard)
@Controller('onboarding/contracts')
export class OnboardingContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post(':id/accept')
  async accept(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { reviewedPages?: number[]; templateHash?: string },
  ) {
    const contract = await this.contractsService.accept(id, req.user.id, {
      ...body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return successResponse(contract);
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('enrollments/:enrollmentId/contracts')
  async generate(
    @Param('enrollmentId', new ParseUUIDPipe()) enrollmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const contract = await this.contractsService.generate(enrollmentId, req.user.id);
    return successResponse(contract);
  }

  @Get('contracts')
  async getAll() {
    const list = await this.contractsService.getAll();
    return successResponse(list);
  }

  @Post('contracts/:id/accept')
  async acceptOnBehalf(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body()
    body: {
      reviewedPages?: number[];
      templateHash?: string;
      reason?: string;
      source?: string;
    },
  ) {
    return successResponse(
      await this.contractsService.accept(id, req.user.id, {
        reviewedPages: body.reviewedPages,
        templateHash: body.templateHash,
        signerReason: body.reason,
        signerSource: body.source,
        adminId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }),
    );
  }
}
