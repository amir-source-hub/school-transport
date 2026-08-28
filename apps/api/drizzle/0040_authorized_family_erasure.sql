CREATE OR REPLACE FUNCTION protect_successful_payment() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('app.family_erasure', true) = 'on' THEN
    RETURN OLD;
  END IF;
  IF OLD.transaction_status = 'SUCCEEDED' THEN
    RAISE EXCEPTION 'successful payment transactions are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_accepted_contract() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('app.family_erasure', true) = 'on' THEN
    RETURN OLD;
  END IF;
  IF OLD.contract_status = 'ACCEPTED' THEN
    RAISE EXCEPTION 'accepted contracts are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION reject_accepted_price_delete() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.family_erasure', true) = 'on' THEN
    RETURN OLD;
  END IF;
  IF OLD.price_status IN ('ACCEPTED', 'REPLACED') THEN
    RAISE EXCEPTION 'accepted price history is immutable';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
