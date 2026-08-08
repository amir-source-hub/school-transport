/**
 * Product status groups for the admin registrations list.
 *
 * The UI sends a single product group (e.g. `waiting_contract`) and the
 * service expands it here to the detailed lifecycle statuses that actually
 * occur in `service_registrations.registration_status` — including the
 * derived statuses INSTALLMENTS_IN_PROGRESS and PAYMENT_COMPLETED computed
 * by the registrations service from payment schedule rows.
 */
export const REGISTRATION_STATUS_GROUPS = [
  { value: 'all', statuses: null },
  { value: 'submitted', statuses: ['SUBMITTED'] },
  { value: 'under_review', statuses: ['UNDER_REVIEW'] },
  { value: 'needs_correction', statuses: ['NEEDS_CORRECTION'] },
  { value: 'approved', statuses: ['APPROVED'] },
  { value: 'rejected', statuses: ['REJECTED'] },
  { value: 'waiting_contract', statuses: ['CONTRACT_PENDING'] },
  { value: 'contract_ready', statuses: ['CONTRACT_READY'] },
  { value: 'accepted_contract', statuses: ['CONTRACT_ACCEPTED'] },
  { value: 'prepaid', statuses: ['ENROLLED'] },
  { value: 'installments', statuses: ['INSTALLMENTS_IN_PROGRESS'] },
  { value: 'completed', statuses: ['PAYMENT_COMPLETED'] },
] as const;

export const REGISTRATION_STATUS_GROUP_VALUES = REGISTRATION_STATUS_GROUPS.map(
  (group) => group.value,
);

export function expandRegistrationStatusGroup(value: string): readonly string[] | null {
  return REGISTRATION_STATUS_GROUPS.find((group) => group.value === value)?.statuses ?? null;
}