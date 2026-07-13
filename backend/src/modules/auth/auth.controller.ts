import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { OtpRequestDto, OtpVerifyDto } from './dto/otp.dto';
import { CurrentPrincipal } from './decorators/current-principal.decorator';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthService } from './services/auth.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { OtpService } from './services/otp.service';
import type { AuthenticatedPrincipal } from './types/authenticated-request';
import type { RequestWithId } from '../../common/types/request-with-id';
import { sha256 } from './utils/security.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
    private readonly google: GoogleOAuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() request: RequestWithId, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto.identifier, dto.password, dto.clientType, dto.deviceName, this.context(request));
    this.setRefreshCookie(response, result.refreshToken);
    return this.withoutRefreshToken(result);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() request: RequestWithId, @Res({ passthrough: true }) response: Response) {
    try {
      const result = await this.auth.refresh(request.cookies?.[this.cookieName()] as string | undefined, this.context(request));
      this.setRefreshCookie(response, result.refreshToken);
      return this.withoutRefreshToken(result);
    } catch (error) {
      this.clearRefreshCookie(response);
      throw error;
    }
  }

  @Get('session')
  @UseGuards(AccessTokenGuard)
  session(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.auth.current(principal.userId, principal.sessionId);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  me(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.auth.current(principal.userId, principal.sessionId);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() request: RequestWithId, @Res({ passthrough: true }) response: Response) {
    await this.auth.logoutByRefresh(request.cookies?.[this.cookieName()] as string | undefined, request.requestId);
    this.clearRefreshCookie(response);
    return { loggedOut: true };
  }

  @Post('logout-all')
  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  async logoutAll(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Req() request: RequestWithId, @Res({ passthrough: true }) response: Response) {
    await this.auth.logoutAll(principal.userId, request.requestId);
    this.clearRefreshCookie(response);
    return { loggedOut: true };
  }

  @Post('otp/request')
  @HttpCode(202)
  requestOtp(@Body() dto: OtpRequestDto, @Req() request: RequestWithId) {
    return this.otp.request(dto.identifier, dto.channel, dto.purpose, request.requestId);
  }

  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(@Body() dto: OtpVerifyDto, @Req() request: RequestWithId) {
    return this.otp.verify(dto.challengeId, dto.code, request.requestId);
  }

  @Get('google/start')
  googleStart(): never { return this.google.unavailable(); }

  @Get('google/callback')
  googleCallback(): never { return this.google.unavailable(); }

  private context(request: RequestWithId) {
    return {
      requestId: request.requestId,
      userAgent: request.get('user-agent'),
      ipHash: request.ip ? sha256(request.ip) : undefined,
    };
  }

  private cookieName(): string { return this.config.get<string>('cookie.name', 'ceylonswift_refresh'); }
  private cookieOptions(): CookieOptions {
    const sameSite = this.config.get<'lax' | 'strict' | 'none'>('cookie.sameSite', 'lax');
    const domain = this.config.get<string>('cookie.domain');
    return {
      httpOnly: true,
      secure: this.config.get<boolean>('cookie.secure', false),
      sameSite,
      path: this.config.get<string>('cookie.path', '/api/v1/auth'),
      maxAge: this.refreshTtlMilliseconds(),
      ...(domain ? { domain } : {}),
    };
  }
  private refreshTtlMilliseconds(): number {
    const value = this.config.get<string>('tokens.refreshTtl', '30d');
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const suffix = match[2] as 's' | 'm' | 'h' | 'd';
    const unit: Record<typeof suffix, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return Number(match[1]) * unit[suffix];
  }
  private withoutRefreshToken<T extends { refreshToken: string }>(result: T): Omit<T, 'refreshToken'> {
    const safeResult = { ...result };
    delete (safeResult as Partial<T>).refreshToken;
    return safeResult;
  }
  private setRefreshCookie(response: Response, token: string): void { response.cookie(this.cookieName(), token, this.cookieOptions()); }
  private clearRefreshCookie(response: Response): void { response.clearCookie(this.cookieName(), this.cookieOptions()); }
}
