import { SetMetadata } from '@nestjs/common';

export interface StepUpRequirement { maxAgeSeconds?: number; requireMfa?: boolean; minimumStrength?: number }
export const STEP_UP_REQUIREMENT = 'authorization:step-up';
export const RequireStepUp = (requirement: StepUpRequirement = {}): MethodDecorator & ClassDecorator =>
  SetMetadata(STEP_UP_REQUIREMENT, requirement);
