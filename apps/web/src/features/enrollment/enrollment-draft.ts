const DRAFT_VERSION = 1;
const DRAFT_MAX_AGE_MS = 2 * 60 * 60 * 1_000;
export const ENROLLMENT_DRAFT_KEY = 'school-transport:enrollment-safe-draft:v1';

const SAFE_FIELDS = [
  'gender',
  'addressTitle',
  'province',
  'city',
  'schoolId',
  'educationLevel',
  'grade',
  'serviceType',
  'paymentPlanType',
] as const;

export type SafeEnrollmentDraft = {
  step: number;
  values: Record<string, string | number>;
};

export function saveEnrollmentDraft(
  storage: Pick<Storage, 'setItem'>,
  mode: string,
  step: number,
  form: Record<string, unknown>,
  now = Date.now(),
) {
  const values = Object.fromEntries(
    SAFE_FIELDS.flatMap((key) =>
      typeof form[key] === 'string' || typeof form[key] === 'number' ? [[key, form[key]]] : [],
    ),
  );
  storage.setItem(
    `${ENROLLMENT_DRAFT_KEY}:${mode}`,
    JSON.stringify({ version: DRAFT_VERSION, savedAt: now, step, values }),
  );
}

export function loadEnrollmentDraft(
  storage: Pick<Storage, 'getItem' | 'removeItem'>,
  mode: string,
  now = Date.now(),
): SafeEnrollmentDraft | undefined {
  const key = `${ENROLLMENT_DRAFT_KEY}:${mode}`;
  const raw = storage.getItem(key);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      parsed.version !== DRAFT_VERSION ||
      typeof parsed.savedAt !== 'number' ||
      now - parsed.savedAt > DRAFT_MAX_AGE_MS ||
      typeof parsed.step !== 'number' ||
      !parsed.values ||
      typeof parsed.values !== 'object' ||
      Array.isArray(parsed.values)
    ) {
      storage.removeItem(key);
      return undefined;
    }
    const values = Object.fromEntries(
      SAFE_FIELDS.flatMap((field) => {
        const value = (parsed.values as Record<string, unknown>)[field];
        return typeof value === 'string' || typeof value === 'number' ? [[field, value]] : [];
      }),
    );
    return { step: Math.min(4, Math.max(1, Math.trunc(parsed.step))), values };
  } catch {
    storage.removeItem(key);
    return undefined;
  }
}

export function clearEnrollmentDraft(storage: Pick<Storage, 'removeItem'>, mode: string) {
  storage.removeItem(`${ENROLLMENT_DRAFT_KEY}:${mode}`);
}
