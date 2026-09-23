# Contributing to Industrial Brain

## Development Philosophy & Strict Rules

1. **Never mock real integrations**: Write real adapters and explicit status indicators (`Not connected` / `Not implemented`).
2. **Never forge metrics or KPIs**: If data does not exist, display `"No data available"`.
3. **Phased Development**: Only implement one Phase at a time. Acceptance criteria must be satisfied and verified with tests before advancing.
4. **Tenant Isolation**: Every query must carry tenant context. Frontend-only checks are strictly prohibited.
5. **Audit Everything**: Any state mutation must produce an audit log entry.
