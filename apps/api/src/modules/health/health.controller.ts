import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { successResponse } from '../../common/response';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return successResponse({ status: 'ok', timestamp: new Date().toISOString() });
  }

  @Public()
  @Get('api/openapi.json')
  openapi() {
    return successResponse({ message: 'OpenAPI spec not yet generated.' });
  }
}
