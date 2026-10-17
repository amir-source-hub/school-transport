# Messaging incidents

Owner: messaging operations. Escalate OTP abuse or authentication impact to the security lead.

1. Confirm provider availability, queue age, failure outcome, affected category, and recent campaign
   changes. Never copy phone numbers, OTP values, message bodies, or provider payloads into tickets.
2. For timeouts, preserve queued work and reduce optional broadcast concurrency. Do not blindly
   replay jobs until provider acceptance and application idempotency are confirmed.
3. For permanent failures or dead letters, inspect redacted error categories and a minimal sample of
   internal identifiers through approved access. Correct the cause before controlled replay.
4. For OTP rate limiting, check application throttling, provider limits, and abuse indicators. Do
   not weaken OTP attempt, cooldown, or expiry controls to clear the alert.
5. For unexpected broadcast volume or spend, disable new broadcasts, preserve campaign/audit
   evidence, and obtain the required business approval before resuming.
6. Close only after queue age, failure rates, provider latency, and spend remain normal for 30
   minutes. Record the affected category, impact, cause, corrective owner, and due date.
