export type OnboardingState = {
  sessionId: string | null;
  expiresAt: string | null;
  currentStep: string | null;
};

let onboardingState: OnboardingState = { sessionId: null, expiresAt: null, currentStep: null };

export function setOnboardingState(state: OnboardingState) {
  onboardingState = state;
}

export function getOnboardingState() {
  return onboardingState;
}

export function clearOnboardingState() {
  onboardingState = { sessionId: null, expiresAt: null, currentStep: null };
}