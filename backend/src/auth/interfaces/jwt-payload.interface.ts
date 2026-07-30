export interface JwtPayload {
  sub: number;
  companyId: number;
  username: string;
  tokenType: 'access' | 'refresh';
  sessionId?: string;
}
