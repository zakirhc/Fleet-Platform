import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
/*
import {
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
  } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport';
  
  @Injectable()
  export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);
  
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
  
      this.logger.log(
        `Authorization header: ${req.headers.authorization}`,
      );
  
      return super.canActivate(context);
    }
  
    handleRequest(err: any, user: any, info: any) {
      this.logger.log(`err = ${err?.message}`);
      this.logger.log(`info = ${info?.message}`);
      this.logger.log(`user = ${JSON.stringify(user)}`);
  
      if (err || !user) {
        throw err || new UnauthorizedException();
      }
  
      return user;
    }
  }
    */
