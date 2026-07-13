export interface OtpDelivery { destination: string; channel: 'EMAIL' | 'SMS'; purpose: string; code: string }
export abstract class OtpProvider { abstract readonly available: boolean; abstract send(delivery: OtpDelivery): Promise<void> }

export class DisabledOtpProvider extends OtpProvider {
  readonly available = false;
  async send(): Promise<void> { return Promise.resolve(); }
}
