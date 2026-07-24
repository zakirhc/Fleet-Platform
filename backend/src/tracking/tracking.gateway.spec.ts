import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

import { TrackingGateway } from './tracking.gateway';

describe('TrackingGateway', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;
  let gateway: TrackingGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new TrackingGateway(jwtService);
  });

  it('joins an authenticated socket to its company room', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 3,
      companyId: 9,
      username: 'dispatcher',
    });
    const socket = {
      handshake: { auth: { token: 'Bearer token' }, headers: {} },
      data: {},
      join: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as Socket;

    await gateway.handleConnection(socket);

    expect(socket.join).toHaveBeenCalledWith('company:9');
    expect(socket.emit).toHaveBeenCalledWith('tracking:ready', {
      companyId: '9',
    });
  });

  it('disconnects an unauthenticated socket', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));
    const socket = {
      handshake: { auth: { token: 'bad-token' }, headers: {} },
      data: {},
      join: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as Socket;

    await gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });
});
