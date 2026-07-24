# Known issues and technical debt

- Existing databases with the legacy Driver table must apply migration `008`.
- The first administrator must call the secret-protected bootstrap endpoint.
- WhatsApp account settings, approved templates, delivery-status callbacks, and
  a retry policy are still pending. Scheduled reports only queue messages when
  an active WhatsApp account is configured.
- Documents currently store a validated external file URL; managed upload
  storage and malware scanning are not implemented.
- Reports use Traccar telemetry samples. Trip boundaries are inferred from a
  30-minute gap; server-side report date ranges and PDF exports are pending.
- Docker configuration has been syntax-checked but not run in this workspace
  because Docker is not installed.
- No production backup/restore automation, CI/CD, or integration test database
  exists yet.
