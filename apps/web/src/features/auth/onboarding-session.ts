export type OnboardingState = {
  sessionId: string | null;
  phoneNumber: string | null;
  nationalId: string | null;
  expiresAt: string | null;
  currentStep: string | null;
  portalRole?: 'PARENT' | 'DRIVER' | null;
};

let onboardingState: OnboardingState = {
  sessionId: null,
  phoneNumber: null,
  nationalId: null,
  expiresAt: null,
  currentStep: null,
  portalRole: null,
};

export function setOnboardingState(state: OnboardingState) {
  onboardingState = state;
}

export function getOnboardingState() {
  return onboardingState;
}

export function clearOnboardingState() {
  onboardingState = {
    sessionId: null,
    phoneNumber: null,
    nationalId: null,
    expiresAt: null,
    currentStep: null,
    portalRole: null,
  };
}
