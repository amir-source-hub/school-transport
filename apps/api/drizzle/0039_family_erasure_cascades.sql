-- Permanent family/student deletion is an explicit admin-only privacy operation.
-- Make every FK below users/students cascade so no identity, enrollment, payment,
-- notification, or operational row can retain deleted family data.
DO $$
DECLARE
  relation record;
  definition text;
BEGIN
  FOR relation IN
    WITH RECURSIVE dependent_fks AS (
      SELECT c.oid, c.conrelid, c.conname
      FROM pg_constraint c
      WHERE c.contype = 'f'
        AND c.confrelid = 'public.users'::regclass
      UNION
      SELECT c.oid, c.conrelid, c.conname
      FROM pg_constraint c
      JOIN dependent_fks parent ON c.confrelid = parent.conrelid
      WHERE c.contype = 'f'
    )
    SELECT DISTINCT oid, conrelid, conname FROM dependent_fks
  LOOP
    SELECT pg_get_constraintdef(relation.oid) INTO definition;
    definition := regexp_replace(
      definition,
      ' ON DELETE (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)',
      '',
      'i'
    );
    EXECUTE format(
      'ALTER TABLE %s DROP CONSTRAINT %I, ADD CONSTRAINT %I %s ON DELETE CASCADE',
      relation.conrelid::regclass,
      relation.conname,
      relation.conname,
      definition
    );
  END LOOP;
END $$;
