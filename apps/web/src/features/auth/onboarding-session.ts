export type OnboardingState = {
  sessionId: string | null;
  phoneNumber: string | null;
  studentNationalId: string | null;
  expiresAt: string | null;
  currentStep: string | null;
};

let onboardingState: OnboardingState = {
  sessionId: null,
  phoneNumber: null,
  studentNationalId: null,
  expiresAt: null,
  currentStep: null,
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
    studentNationalId: null,
    expiresAt: null,
    currentStep: null,
  };
}
