'use client';
import { StudentPortalLoginForm } from './student-portal-login-form';

export function DriverComingSoonForm() {
  return <StudentPortalLoginForm enrollmentPath="/onboarding/driver-enrollment" audience="driver" />;
}
