CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit history is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_successful_payment() RETURNS trigger AS $$
BEGIN
  IF OLD.transaction_status = 'SUCCEEDED' THEN
    RAISE EXCEPTION 'successful payment transactions are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER payment_transactions_success_immutable
BEFORE UPDATE OR DELETE ON payment_transactions
FOR EACH ROW EXECUTE FUNCTION protect_successful_payment();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_accepted_contract() RETURNS trigger AS $$
BEGIN
  IF OLD.contract_status = 'ACCEPTED' THEN
    RAISE EXCEPTION 'accepted contracts are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER contracts_accepted_immutable
BEFORE UPDATE OR DELETE ON contracts
FOR EACH ROW EXECUTE FUNCTION protect_accepted_contract();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_accepted_price_terms() RETURNS trigger AS $$
BEGIN
  IF OLD.price_status IN ('ACCEPTED', 'REPLACED') AND (
    NEW.registration_id IS DISTINCT FROM OLD.registration_id OR
    NEW.version_number IS DISTINCT FROM OLD.version_number OR
    NEW.total_amount IS DISTINCT FROM OLD.total_amount OR
    NEW.currency IS DISTINCT FROM OLD.currency OR
    NEW.full_payment_allowed IS DISTINCT FROM OLD.full_payment_allowed OR
    NEW.installment_payment_allowed IS DISTINCT FROM OLD.installment_payment_allowed OR
    NEW.prepayment_amount IS DISTINCT FROM OLD.prepayment_amount OR
    NEW.installment_count IS DISTINCT FROM OLD.installment_count OR
    NEW.set_by_admin_id IS DISTINCT FROM OLD.set_by_admin_id OR
    NEW.set_at IS DISTINCT FROM OLD.set_at OR
    NEW.parent_confirmed_at IS DISTINCT FROM OLD.parent_confirmed_at
  ) THEN
    RAISE EXCEPTION 'accepted price terms are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER registration_prices_terms_immutable
BEFORE UPDATE ON registration_prices
FOR EACH ROW EXECUTE FUNCTION protect_accepted_price_terms();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION reject_accepted_price_delete() RETURNS trigger AS $$
BEGIN
  IF OLD.price_status IN ('ACCEPTED', 'REPLACED') THEN
    RAISE EXCEPTION 'accepted price history is immutable';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER registration_prices_history_no_delete
BEFORE DELETE ON registration_prices
FOR EACH ROW EXECUTE FUNCTION reject_accepted_price_delete();
