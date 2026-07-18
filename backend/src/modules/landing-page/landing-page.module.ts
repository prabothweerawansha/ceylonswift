import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { LandingContentController } from './controllers/landing-content.controller';
import { PublicLandingPageController } from './controllers/public-landing-page.controller';
import { ReviewsController } from './controllers/reviews.controller';
import { LandingPageService } from './services/landing-page.service';
import { FeaturePolicyService } from './services/feature-policy.service';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [PublicLandingPageController, LandingContentController, ReviewsController],
  providers: [LandingPageService, FeaturePolicyService],
  exports: [FeaturePolicyService],
})
export class LandingPageModule {}
