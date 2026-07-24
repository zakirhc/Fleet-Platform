import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWhatsappAccountDto } from './dto/create-whatsapp-account.dto';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import { WhatsappService } from './whatsapp.service';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly service: WhatsappService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('accounts')
  createAccount(
    @Req() req: { user: { companyId: number } },
    @Body() dto: CreateWhatsappAccountDto,
  ) {
    return this.service.createAccount(BigInt(req.user.companyId), dto);
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('accounts')
  accounts(@Req() req: { user: { companyId: number } }) {
    return this.service.listAccounts(BigInt(req.user.companyId));
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('messages')
  messages(@Req() req: { user: { companyId: number } }) {
    return this.service.listMessages(BigInt(req.user.companyId));
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('accounts/:accountId/messages')
  send(
    @Req() req: { user: { companyId: number } },
    @Param('accountId') accountId: string,
    @Body() dto: SendWhatsappMessageDto,
  ) {
    return this.service.send(
      BigInt(req.user.companyId),
      BigInt(accountId),
      dto.recipient,
      dto.body,
    );
  }

  @Get('webhook/:companyId')
  async verify(
    @Param('companyId') companyId: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() response: Response,
  ) {
    if (await this.service.verifyWebhook(BigInt(companyId), token))
      return response.status(200).send(challenge);
    return response.sendStatus(403);
  }
  @Post('webhook/:companyId')
  @HttpCode(200)
  async webhook(
    @Param('companyId') companyId: string,
    @Req() request: Request & { rawBody?: Buffer },
    @Body() payload: unknown,
  ) {
    await this.service.processWebhook(
      BigInt(companyId),
      request.rawBody,
      Array.isArray(request.headers['x-hub-signature-256'])
        ? request.headers['x-hub-signature-256'][0]
        : request.headers['x-hub-signature-256'],
      payload,
    );
    return { received: true };
  }
}
