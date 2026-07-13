import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { environmentSchema } from './environment.schema';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: false,
      load: [configuration],
      validationSchema: environmentSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
