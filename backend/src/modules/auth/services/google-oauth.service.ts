import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleOAuthService {
  constructor(private readonly config: ConfigService) {}
  unavailable(): never {
    if (!this.config.get<string>('google.clientId') || !this.config.get<string>('google.clientSecret') || !this.config.get<string>('google.callbackUrl')) {
      throw new ServiceUnavailableException({ code: 'AUTH_PROVIDER_UNAVAILABLE', message: 'Google authentication is unavailable.', details: null });
    }
    throw new ServiceUnavailableException({ code: 'AUTH_PROVIDER_NOT_ENABLED', message: 'Google authentication is not enabled.', details: null });
  }
}
