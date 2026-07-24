import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReportScheduleDto } from './dto/create-report-schedule.dto';
import { ReportService } from './report.service';
@ApiTags('Reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('reports')
export class ReportController { constructor(private readonly service:ReportService){} private range(from?:string,to?:string){const end=to?new Date(to):new Date();return[from?new Date(from):new Date(end.getTime()-86400000),end] as const;}
@Get('utilisation') utilisation(@Req() req:{user:{companyId:number}},@Query('from') from?:string,@Query('to') to?:string){const[a,b]=this.range(from,to);return this.service.utilisation(BigInt(req.user.companyId),a,b)}
@Get('driver-behaviour') behaviour(@Req() req:{user:{companyId:number}},@Query('from') from?:string,@Query('to') to?:string){const[a,b]=this.range(from,to);return this.service.driverBehaviour(BigInt(req.user.companyId),a,b)}
@Get('idling') idling(@Req() req:{user:{companyId:number}},@Query('from') from?:string,@Query('to') to?:string){const[a,b]=this.range(from,to);return this.service.idling(BigInt(req.user.companyId),a,b)}
@Get('trips') trips(@Req() req:{user:{companyId:number}},@Query('from') from?:string,@Query('to') to?:string){const[a,b]=this.range(from,to);return this.service.trips(BigInt(req.user.companyId),a,b)}
@Get('fuel-expense') fuelExpense(@Req() req:{user:{companyId:number}},@Query('from') from?:string,@Query('to') to?:string){const[a,b]=this.range(from,to);return this.service.fuelExpense(BigInt(req.user.companyId),a,b)}
@Get('utilisation.csv') async csv(@Req() req:{user:{companyId:number}},@Query('from') from:string|undefined,@Query('to') to:string|undefined,@Res() res:any){const[a,b]=this.range(from,to);res.type('text/csv').attachment('utilisation.csv').send(this.service.toCsv(await this.service.utilisation(BigInt(req.user.companyId),a,b)))}
@Get('schedules') schedules(@Req() req:{user:{companyId:number}}){return this.service.schedules(BigInt(req.user.companyId))}
@Post('schedules') createSchedule(@Req() req:{user:{companyId:number}},@Body() dto:CreateReportScheduleDto){return this.service.createSchedule(BigInt(req.user.companyId),dto)} }
