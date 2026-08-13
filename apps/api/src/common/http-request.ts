import type { FastifyRequest } from 'fastify';

export type AuthenticatedRequest = FastifyRequest & {
  user: { id: string; role: 'PARENT' | 'ADMIN' | 'SCHOOL_MANAGER'; sessionId: string };
};

export type OnboardingRequest = FastifyRequest & {
  onboarding: {
    id: string;
    userId: string;
    phoneNumber: string;
    currentStep: string | null;
    expiresAt: Date;
  };
};
