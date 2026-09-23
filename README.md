# INDUSTRIAL BRAIN

An AI-native operational intelligence layer that connects industrial systems, enforces strict tenant isolation, RBAC, tamper-evident audit trails, and policy-driven operations.

> **Foundational Principle:**
> REAL DATA → REAL REASONING → REAL DECISION → CONTROLLED ACTION → VERIFICATION → MEASURABLE RESULT

---

## Master Architecture Overview

```
Factory / Company Systems (ERP, MES, CMMS, SCADA, Databases)
                          ↓
                      Connectors
                          ↓
                    Data Ingestion
                          ↓
               Validation / Normalization
                          ↓
                PostgreSQL Source of Truth
                          ↓
              Industrial Knowledge Layer
                          ↓
                   Hybrid Retrieval
                          ↓
                  AI Provider Layer
                          ↓
               Specialized AI Agents
                          ↓
                    Policy Engine
                          ↓
                   Approval Engine
                          ↓
                   Action Executor
                          ↓
                  External Systems
                          ↓
                    Verification
                          ↓
                    Audit Trail
```

---

## Phase Execution Roadmap

- [x] **Phase 1: Core Platform** (Current)
  - Multi-tenant isolation
  - Authentication (JWT + secure salt hashing)
  - RBAC (Roles: `SUPER_ADMIN`, `ORG_ADMIN`, `PLANT_MANAGER`, `PROCESS_ENGINEER`, `OPERATOR`, `AUDITOR`, `VIEWER`)
  - Tamper-evident Audit Engine with HMAC checksums
  - Health checks & system observability
  - API v1 specification (`/api/v1/*`)
  - Industrial dashboard shell (zero fake KPIs)
  - Test suites (Unit, Integration, RBAC, Tenant Isolation)
  - Production readiness documentation

- [ ] **Phase 2: Real Data Connectors** (Next)
  - CSV & XLSX ingestion engines
  - Read-only PostgreSQL discovery & incremental sync
  - Generic REST connector with SSRF protection

- [ ] **Phase 3: Industrial Knowledge Layer**
  - Industrial entities & deterministic resolution
  - Document parsing & provenance tracking
  - Hybrid retrieval (PostgreSQL + pgvector)

- [ ] **Phase 4: AI Reasoning Engine**
  - AI Provider abstraction
  - ExecutiveAnalysisAgent
  - Prompt injection defense & evidence attribution

- [ ] **Phase 5: Production Dashboard**
  - Full domain pages, real-time data freshness, AI chat with evidence links

- [ ] **Phase 6: Policy + Approval + Action Engine**
  - Safe internal actions, human approvals, execution verification

- [ ] **Phase 7: Industrial Connectivity**
  - Read-only OPC-UA, MQTT, and industrial gateway

- [ ] **Phase 8: Production Hardening**
  - Security audit, query optimization, backup & restore procedures

---

## Repository Structure

```
industrial-brain/
├── apps/
│   ├── api/         # Python FastAPI modular monolith
│   ├── web/         # Web frontend shell
│   └── worker/      # Queue worker abstraction
├── packages/
│   ├── shared/      # Types, RBAC matrix, schemas
│   ├── audit/       # Tamper-evident audit engine
│   ├── policies/    # Policy definitions
│   ├── connectors/  # Connector contracts
│   └── knowledge/   # Entity definitions
├── infrastructure/
│   ├── docker/      # Container definitions
│   ├── nginx/       # Reverse proxy config
│   └── postgres/    # Database init & migrations
├── tests/
│   ├── unit/        # Auth, RBAC, security unit tests
│   └── integration/ # Tenant isolation & audit tests
├── docs/            # Architecture, API & Production Readiness
├── server.ts        # Node/Express production runtime on port 3000
├── docker-compose.yml
└── .env.example
```

---

## Running the Platform

### Local Development / AI Studio
```bash
# Install dependencies
npm install

# Run automated tests
npm test

# Run development server
npm run dev
```

### Docker Deployment
```bash
docker-compose up -d
```
