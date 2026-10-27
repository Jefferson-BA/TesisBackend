import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { getClientInfo } from '../common/utils/client-info.util';

import { SuperadminFinanceService } from './superadmin-finance.service';
import { ForceCancelOrderDto } from './dto/force-cancel-order.dto';
import { CulqiRefundDto } from './dto/culqi-refund.dto';
import { AdjustOrderAmountDto } from './dto/adjust-order-amount.dto';
import { FinancialReportQueryDto } from './dto/financial-report-query.dto';

@Controller('superadmin/finance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPERADMIN')
export class SuperadminFinanceController {
  constructor(private readonly financeService: SuperadminFinanceService) {}

  @Post('orders/:id/force-cancel')
  forceCancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ForceCancelOrderDto,
    @Req() req: any,
  ) {
    const clientInfo = getClientInfo(req);
    return this.financeService.forceCancelOrder(id, req.user.id, dto, clientInfo);
  }

  @Post('orders/:id/refund')
  processCulqiRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CulqiRefundDto,
    @Req() req: any,
  ) {
    const clientInfo = getClientInfo(req);
    return this.financeService.processCulqiRefund(id, req.user.id, dto, clientInfo);
  }

  @Patch('orders/:id/adjust-amount')
  adjustOrderAmount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustOrderAmountDto,
    @Req() req: any,
  ) {
    const clientInfo = getClientInfo(req);
    return this.financeService.adjustOrderAmount(id, req.user.id, dto, clientInfo);
  }

  @Get('reports')
  getFinancialReports(@Query() queryDto: FinancialReportQueryDto) {
    return this.financeService.getFinancialReports(queryDto);
  }
}
