import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { corsOrigins } from '../common/config/cors';

export type PositionUpdate = {
  deviceId: string;
  positionId: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  fixTime: string;
  attributes?: string | null;
};

@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: corsOrigins, credentials: true },
})
export class TrackingGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token = this.getToken(socket);
      const user = await this.jwtService.verifyAsync<JwtPayload>(token);
      socket.data.user = user;
      await socket.join(this.companyRoom(user.companyId));
      socket.emit('tracking:ready', { companyId: String(user.companyId) });
    } catch {
      socket.emit('tracking:error', {
        message: 'Unauthorized socket connection.',
      });
      socket.disconnect(true);
    }
  }

  @SubscribeMessage('tracking:subscribe')
  subscribe(@ConnectedSocket() socket: Socket) {
    const user = socket.data.user as JwtPayload | undefined;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    return {
      event: 'tracking:subscribed',
      data: { companyId: String(user.companyId) },
    };
  }

  broadcastPosition(companyId: bigint, position: PositionUpdate): void {
    this.server
      .to(this.companyRoom(companyId))
      .emit('position:update', position);
  }

  broadcastEvent(companyId: bigint, event: Record<string, unknown>): void {
    this.server.to(this.companyRoom(companyId)).emit('tracking:event', event);
  }

  private getToken(socket: Socket): string {
    const authToken = socket.handshake.auth.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken.replace(/^Bearer\s+/i, '');
    }

    const authorization = socket.handshake.headers.authorization;
    if (typeof authorization === 'string' && authorization.length > 0) {
      return authorization.replace(/^Bearer\s+/i, '');
    }

    throw new Error('Token missing');
  }

  private companyRoom(companyId: bigint | number): string {
    return `company:${companyId.toString()}`;
  }
}
