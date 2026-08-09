# Notification and Kavenegar SMS inventory

## Delivery model

- Domain services enqueue logical events in `notification_outbox` in the same database transaction as their state change.
- The worker always creates the existing in-app notification first, then independently attempts SMS. An SMS failure therefore cannot roll back a successful enrollment, payment, contract, or profile change.
- Each SMS attempt uses `<event-id>:SMS` as its idempotency key. Kavenegar receives a stable numeric `localid` derived from that key.
- Optional updates are sent only when current `SMS` / `OPTIONAL_UPDATES` consent is still granted at dispatch time. Required service notices and requested OTP security messages do not use optional-marketing consent.
- SMS bodies contain only a generic status-change notice and direct the recipient to the authenticated panel. They exclude names, national IDs, addresses, child details, and financial amounts.

## Existing event producers

| Area                | Notification types found                                                                                             | Recipient/audience | SMS purpose                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------- |
| Identity/onboarding | `ACCOUNT_REGISTERED`, `WELCOME`                                                                                      | Account user       | Service notice; `WELCOME` is optional |
| Family profile      | `PROFILE_UPDATED`, `ADDRESS_UPDATED`, `EMERGENCY_CONTACT_UPDATED`                                                    | Account user       | Optional update                       |
| Students/capacity   | `ADMIN_STUDENT_ADDED`, `LIMIT_REQUEST_CREATED`, `LIMIT_REQUEST_APPROVED`, `LIMIT_REQUEST_REJECTED`                   | Event `userId`     | Service notice                        |
| Enrollment          | `ENROLLMENT_CREATED`, `REGISTRATION_UPDATE` (seed fixture)                                                           | Account user       | Service notice                        |
| Pricing             | `PRICE_OFFERED`, `PRICE_ACCEPTED`                                                                                    | Account user       | Service notice                        |
| Payments            | `PAYMENT_SUCCEEDED`, `PAYMENT_APPROVED`, `PAYMENT_REJECTED`, `PAYMENT_PLAN_READY`, `PAYMENT_REMINDER` (seed fixture) | Account user       | Service notice                        |
| Contracts           | `CONTRACT_READY`, `CONTRACT_ACCEPTED`, `CONTRACT_REJECTED`                                                           | Account user       | Service notice                        |

The current `GET /admin/notifications` view is an operational projection of selected user-domain notifications, not a dedicated per-admin inbox. This integration delivers SMS for outbox events addressed to a concrete `users.id`; it does not implement the separately deferred admin broadcast/campaign feature.

## Kavenegar configuration

Set these deployment secrets/settings (the repository examples contain placeholders only):

```dotenv
SMS_PROVIDER=kavenegar
OTP_PROVIDER=kavenegar
KAVEHNEGAR_API_KEY=
KAVEHNEGAR_BASE_URL=https://api.kavenegar.com/v1
KAVEHNEGAR_SENDER=
KAVEHNEGAR_OTP_TEMPLATE=schooltransportotp
KAVEHNEGAR_TIMEOUT_MS=5000
```

Create and obtain approval for `KAVEHNEGAR_OTP_TEMPLATE` in the Kavenegar console before enabling production OTP. `KAVEHNEGAR_SENDER` may be left empty to use the account's default sender line.

## Operational boundaries

- `SMS_PROVIDER=none` disables ordinary SMS while preserving in-app delivery.
- `OTP_PROVIDER=console` remains development-only; production validation rejects it.
- Kavenegar VerifyLookup is used for OTP and `sms/send` for ordinary notifications.
- Provider/network failures are normalized without exposing provider payloads, API keys, phone numbers, or account-existence information.
- Delivery-status callbacks and bulk admin broadcasts are not part of this baseline and remain explicitly deferred.

## Account-security notification boundary

Requested OTPs are the security message for parent authentication and administrator second-factor
verification; sending a second notification for the same requested login would add cost and noise
without providing an independent channel. OTP metrics therefore record only bounded aggregate
outcomes. Administrator password or phone changes revoke all active sessions and create a privileged
audit event. Administrator identities are deliberately separate from student notification recipients,
so these changes must not be forced through the parent notification catalog. If a separately verified
administrator security channel is introduced later, it requires an explicit catalog and threat-model
review first.
