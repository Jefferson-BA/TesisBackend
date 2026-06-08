import { Controller, Get } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';

@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats') // El endpoint final será: GET /admin/dashboard/stats
  getStats() {
    return this.dashboardService.getDashboardStats();
  }
}