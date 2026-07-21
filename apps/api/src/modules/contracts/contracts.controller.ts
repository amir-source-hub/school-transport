import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';

@UseGuards(AuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  async getAll(@Req() req: any) {
    const list = await this.contractsService.getByFamily(req.user.id);
    return successResponse(list);
  }

  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string) {
    const contract = await this.contractsService.getById(id, req.user.id);
    return successResponse(contract);
  }

  @Post(':id/accept')
  async accept(@Req() req: any, @Param('id') id: string) {
    const contract = await this.contractsService.accept(id, req.user.id);
    return successResponse(contract);
  }

  @Post(':id/reject')
  async reject(@Req() req: any, @Param('id') id: string) {
    const contract = await this.contractsService.reject(id, req.user.id);
    return successResponse(contract);
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('enrollments/:enrollmentId/contracts')
  async generate(@Param('enrollmentId') enrollmentId: string, @Req() req: any) {
    const contract = await this.contractsService.generate(enrollmentId, req.user.id);
    return successResponse(contract);
  }

  @Get('contracts')
  async getAll() {
    const list = await this.contractsService.getAll();
    return successResponse(list);
  }
}
