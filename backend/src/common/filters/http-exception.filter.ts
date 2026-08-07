import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { Request, Response } from 'express';
  
  @Catch()
  export class HttpExceptionFilter
    implements ExceptionFilter
  {
    catch(exception: unknown, host: ArgumentsHost) {

      const ctx = host.switchToHttp();
  
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();
  
      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        console.error('========== EXCEPTION ==========');
        console.error(exception);
        console.error('===============================');
      }
  
      const message =
        exception instanceof HttpException
          ? exception.getResponse()
          : 'Internal Server Error';
  
      response.status(status).json({
        success: false,
        statusCode: status,
        message,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    }
  }
