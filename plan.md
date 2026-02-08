# plan.md (Updated)

## 1. Objectives
- **Completed:** Deliver a working web-based OLT Huawei Registration system that replaces direct CLI usage for:
  - ONT auto-discovery (`display ont autofind all`)
  - ONT registration (`ont add ... sn-auth ...`)
  - service-port creation (`service-port ...`)
- **Completed:** Provide a UI similar to ALLinPOI ITMS (blue header, sidebar, data-dense tables with light green headers) for:
  - **ONT Register Profile** management
  - **ONT Automatic Discovery** and batch selection
- **Completed:** Provide backend (FastAPI) + MongoDB for:
  - Users/auth
  - OLT connections
  - Registration profiles
  - Discovery snapshots
  - Registration logs (who/when/what, plus commands/output)
- **Completed:** Implement **1-click registration** that auto-detects:
  - next available **ONT ID** per GPON port
  - next available **service-port ID**
- **Next:** Hardening for production/in-network usage:
  - secure credential storage, better telnet reliability, concurrency control, and operational safeguards

## 2. Implementation Steps

### Phase 1 — Core Telnet POC (isolation; do not proceed until stable)
**Status: COMPLETED (POC parsing + command generation validated with mock outputs).**

**User stories (completed)**
1. Validate Telnet login flow (username/password → enable → config).
2. Run `display ont autofind all` and parse discovered ONTs.
3. Auto-find next free ONT ID on `gpon 0/X/Y`.
4. Auto-find next free service-port ID.
5. Register ONT end-to-end and provide success/failure report.

**What was done**
- Implemented and verified parsing logic and command generation with a POC script:
  - `tests/poc_telnet.py`
  - Parsers:
    - `parse_autofind_output()`
    - `parse_ont_info_output()`
    - `parse_service_port_output()`
  - Auto-detection:
    - `find_next_available_ont_id()`
    - `find_next_available_service_port()`
  - Command generation:
    - `generate_ont_add_command()`
    - `generate_service_port_command()`
- Confirmed CLI workflow based on user commands:
  - `display ont autofind all`
  - `interface gpon 0/X/Y` → `ont add ... sn-auth ...`
  - `service-port ... vlan ... gpon 0/X/Y ont ... gemport ... user-vlan ... translate`

**Exit criteria**
- Parsing and ID auto-detection logic passes POC tests in this environment.
- Note: Real OLT telnet execution requires in-network validation (environment constraint).

---

### Phase 2 — V1 App Development (MVP)
**Status: COMPLETED (MVP built + UI validated + backend APIs working).**

**User stories (completed)**
1. Add OLT connection (IP/port/user/pass) and test connectivity.
2. Create registration profiles (line/srv profile IDs, VLANs, gemport, user-vlan).
3. Click “Temukan ONT Baru” to run autofind and display discovered ONTs.
4. Select discovered ONTs + choose a profile and run “Registrasi 1-Klik”.
5. View per-ONT results and review logs.

**Backend (FastAPI) – implemented**
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- OLT CRUD + Test:
  - `GET/POST/PUT/DELETE /api/olts`
  - `POST /api/olts/{id}/test` (telnet required)
- Profiles CRUD:
  - `GET/POST/PUT/DELETE /api/profiles`
- Discovery:
  - `POST /api/discovery/scan` (telnet required)
  - `GET /api/discovery/latest/{olt_id}`
- Registration:
  - `POST /api/register` (telnet required)
  - Auto-detects ONT ID + service-port ID, then executes commands.
- Logs + Dashboard:
  - `GET /api/logs`
  - `GET /api/logs/{id}`
  - `GET /api/dashboard/stats`
  - `GET /api/health`
- Telnet module implemented:
  - `backend/olt_telnet.py` uses `telnetlib` with pagination handling.

**Frontend (React + shadcn) – implemented**
- **Login/Register page**
- **Dashboard** with KPI cards and recent registrations
- **OLT Management** (CRUD UI + “Uji Koneksi”)
- **ONT Register page**:
  - ONT Register Profile table (CRUD)
  - ONT Automatic Discovery table + selection
  - Profile selection dropdown
  - “Temukan ONT Baru” and “Registrasi 1-Klik” actions
  - Results dialog showing commands + outcomes
- **Registration Logs** page with detail dialog
- App shell:
  - Sidebar navigation + blue top header
  - Light green table headers per reference

**Testing (end of phase)**
- **Completed:** Testing agent reported **97% overall pass rate** with **no critical bugs**.
- Telnet-dependent endpoints cannot be fully validated in this hosted environment (needs in-network OLT access).

---

### Phase 3 — Authentication + Logging hardening
**Status: PARTIALLY COMPLETED (Auth + logs already implemented). Remaining: security + roles + filtering + concurrency).**

**User stories (remaining / improvements)**
1. Add roles (Admin/Operator) to restrict OLT/Profile modifications.
2. Strengthen audit logging (immutability guarantees, richer context).
3. Add filtering on logs (SN/OLT/date/operator) for operational tracing.
4. Store OLT credentials more securely (encrypt at rest; never return plaintext).
5. Add concurrency guard per OLT (one telnet session at a time).

**Implementation steps (next)**
- Add role-based access controls to endpoints (Admin vs Operator).
- Encrypt OLT password at rest using app-level key (env `CREDENTIALS_KEY`) and decrypt only for telnet session.
- Ensure API always masks passwords on responses.
- Add query parameters for `/api/logs` filtering.
- Add per-OLT async lock/queue to avoid overlapping telnet sessions.

**Testing**
- E2E: login → create OLT/profile → scan → register → verify log attribution + filters.

---

### Phase 4 — Reliability upgrades (post-V1)
**Status: PLANNED.**

**User stories**
1. Queued/batch registrations (avoid telnet overload).
2. Retry/backoff on transient errors.
3. Per-command timing + debug mode.
4. Configurable timeouts/paging prompts to handle CLI variations.
5. Safer pre-checks (existing SN, VLAN/service-port conflicts).

**Implementation steps**
- Add background jobs (in-process first; Celery optional).
- Add pre-check commands and validations:
  - SN already provisioned?
  - ONT ID availability
  - service-port availability
- Build a library of anonymized CLI output fixtures for robust parsing tests.

## 3. Next Actions
1. **In-network validation (required):** Run against real OLT to verify:
   - Prompt patterns and enable/config flow
   - `display ont autofind all` output variants (R015 vs R018)
   - `display ont info {port} all` output variants
   - `display service-port all` output variants
   - Pagination prompts and timeouts
2. Confirm operational rules:
   - ONT ID allocation policy (lowest-free vs next-highest)
   - service-port ID allocation policy
   - VLAN strategy (single VLAN vs profile VLAN lists/ranges)
3. Implement Phase 3 hardening items (roles, encryption, log filters, per-OLT lock).

## 4. Success Criteria
- **MVP (already achieved):**
  - Working UI: login, OLT CRUD, profiles CRUD, discovery table, 1-click registration flow, logs.
  - Backend APIs stable; 97% tests passed with no critical issues.
- **In-network readiness:**
  - Telnet operations succeed reliably on MA5600 R015/R018 with real outputs.
  - Auto-detection prevents collisions and handles edge cases.
- **Security + Ops hardening:**
  - No credential leakage, passwords encrypted at rest.
  - Role-based access, full audit logs, filters, and per-OLT concurrency control.
