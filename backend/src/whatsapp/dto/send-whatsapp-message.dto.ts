import { IsString, Matches, MaxLength } from 'class-validator';

export class SendWhatsappMessageDto {
  @IsString() @Matches(/^\d{7,15}$/) recipient: string;
  @IsString() @MaxLength(4096) body: string;
}
