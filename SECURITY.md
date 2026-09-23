# Security Policy

## Security Commitments

1. **Strict Tenant Isolation**: Every database read, write, query, and audit retrieval strictly validates the tenant context at the database and middleware level. No tenant can view or mutate records belonging to another tenant.
2. **Untrusted Input Policy**: All documents, industrial telemetry, and external inputs are treated as untrusted data. Prompt injections within ingested documents are isolated and cannot alter system instructions.
3. **No Arbitrary Execution**:
   - No arbitrary shell commands.
   - No arbitrary SQL writes.
   - No arbitrary HTTP requests (SSRF protection enforced).
   - No unrestricted ERP or PLC writes.
4. **Secret Management**:
   - Zero hardcoded secrets in source code.
   - Credentials encrypted at rest.
   - Passwords and API keys never exposed in logs or audit traces.
5. **Tamper-evident Audit Trail**:
   - Every sensitive event (logins, role changes, data imports, action proposals, approvals) is cryptographically signed using an HMAC checksum.

## Reporting a Vulnerability

If you discover any security issue, please contact the security team at `security@industrial-brain.internal` or open a confidential security advisory.
