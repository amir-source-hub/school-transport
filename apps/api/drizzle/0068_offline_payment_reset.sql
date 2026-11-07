CREATE OR REPLACE FUNCTION protect_successful_payment() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.family_erasure', true) = 'on' THEN
    RETURN OLD;
  END IF;

  IF OLD.transaction_status = 'SUCCEEDED' AND TG_OP = 'UPDATE' THEN
    IF current_setting('app.offline_payment_reset', true) = 'on'
       AND OLD.payment_method = 'OFFLINE_RECEIPT'
       AND NEW.transaction_status = 'REVERSED'
       AND NEW.failure_code = 'ADMIN_RECEIPT_RESET'
       AND to_jsonb(NEW) - ARRAY['transaction_status', 'failure_code', 'updated_at'] =
           to_jsonb(OLD) - ARRAY['transaction_status', 'failure_code', 'updated_at'] THEN
      RETURN NEW;
    END IF;
  END IF;

  IF OLD.transaction_status IN ('SUCCEEDED', 'REVERSED') THEN
    RAISE EXCEPTION 'successful and reversed payment transactions are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
