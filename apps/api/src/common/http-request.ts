import type { FastifyRequest } from 'fastify';

export type AuthenticatedRequest = FastifyRequest & {
  user: { id: string; role: 'PARENT' | 'ADMIN' | 'SCHOOL_MANAGER' | 'DRIVER'; sessionId: string };
};

export type OnboardingRequest = FastifyRequest & {
  onboarding: {
    id: string;
    userId: string;
    phoneNumber: string;
    portalRole: 'PARENT' | 'DRIVER';
    currentStep: string | null;
    expiresAt: Date;
  };
};
