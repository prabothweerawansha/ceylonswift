import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class PasskeyService {
  assertEnabled(): never {
    throw new NotImplementedException({ code: 'PASSKEY_NOT_ENABLED', message: 'Passkey authentication is not enabled.', details: null });
  }
}
