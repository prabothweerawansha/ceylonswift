import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AccessTokenService } from './services/access-token.service';
import { AuthAuditService } from './services/audit.service';
import { AuthService } from './services/auth.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { MfaService } from './services/mfa.service';
import { OtpService } from './services/otp.service';
import { PasskeyService } from './services/passkey.service';
import { PasswordService } from './services/password.service';
import { AuthRateLimitService } from './services/rate-limit.service';

@Module({
  controllers: [AuthController],
  providers: [AccessTokenGuard, AccessTokenService, AuthAuditService, AuthService, GoogleOAuthService, MfaService, OtpService, PasskeyService, PasswordService, AuthRateLimitService],
  exports: [AccessTokenGuard, AccessTokenService, AuthAuditService, AuthService, MfaService, PasskeyService, PasswordService],
})
export class AuthModule {}
