import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateExpenseRecordDto, CreateFuelRecordDto, CreateMaintenanceScheduleDto, CreateWorkOrderDto, UpdateWorkOrderDto } from './dto/create-operations.dto';
import { OperationsService } from './operations.service';
@ApiTags('Operations') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('operations')
export class OperationsController { constructor(private readonly service: OperationsService) {}
 @Get('maintenance-schedules') schedules(@Req() req:{user:{companyId:number}}){return this.service.schedules(BigInt(req.user.companyId));}
 @Post('maintenance-schedules') createSchedule(@Req() req:{user:{companyId:number}},@Body() dto:CreateMaintenanceScheduleDto){return this.service.createSchedule(BigInt(req.user.companyId),dto);}
 @Get('work-orders') workOrders(@Req() req:{user:{companyId:number}}){return this.service.workOrders(BigInt(req.user.companyId));}
 @Post('work-orders') createWorkOrder(@Req() req:{user:{companyId:number}},@Body() dto:CreateWorkOrderDto){return this.service.createWorkOrder(BigInt(req.user.companyId),dto);}
 @Patch('work-orders/:id') updateWorkOrder(@Req() req:{user:{companyId:number}},@Param('id') id:string,@Body() dto:UpdateWorkOrderDto){return this.service.updateWorkOrder(BigInt(req.user.companyId),id,dto.status,dto.actualCost);}
 @Get('fuel') fuel(@Req() req:{user:{companyId:number}}){return this.service.fuel(BigInt(req.user.companyId));}
 @Post('fuel') createFuel(@Req() req:{user:{companyId:number}},@Body() dto:CreateFuelRecordDto){return this.service.createFuel(BigInt(req.user.companyId),dto);}
 @Get('expenses') expenses(@Req() req:{user:{companyId:number}}){return this.service.expenses(BigInt(req.user.companyId));}
 @Post('expenses') createExpense(@Req() req:{user:{companyId:number}},@Body() dto:CreateExpenseRecordDto){return this.service.createExpense(BigInt(req.user.companyId),dto);}
}
