import { SetMetadata } from '@nestjs/common';

export const PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';
export const ONBOARDING_ROLE_KEY = 'onboardingRole';

export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
export const OnboardingRole = (role: 'PARENT' | 'DRIVER') =>
  SetMetadata(ONBOARDING_ROLE_KEY, role);

export const REQUEST_USER_KEY = 'requestUser';
