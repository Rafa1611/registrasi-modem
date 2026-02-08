# plan.md

## 1. Objectives
- Prove reliable Telnet automation to Huawei MA5600 (R015/R018) for **autofind → register ONT → create service-port** with robust parsing and error handling.
- Deliver a web UI (React + shadcn) similar to ALLinPOI ITMS for **ONT Register Profile** and **ONT Automatic Discovery**.
- Provide backend (FastAPI) + MongoDB for **users, OLT connections, registration profiles, discovery snapshots, registration logs**.
- Implement **1-click registration** that auto-detects **next ONT ID** and **next service-port ID**, then logs **who/when/what**.

## 2. Implementation Steps

### Phase 1 — Core Telnet POC (isolation; do not proceed until stable)
**User stories**
1. As an operator, I want to validate Telnet login (username/password → enable → config) so I know automation can reach the OLT.
2. As an operator, I want to run `display ont autofind all` and see parsed results so I can select the right ONT SN.
3. As an operator, I want to auto-find the next free ONT ID on `gpon 0/X/Y` so I don’t collide with existing ONTs.
4. As an operator, I want to auto-find the next free service-port ID so I don’t collide with existing service ports.
5. As an operator, I want to register one ONT end-to-end and get a clear success/failure report.

**Steps**
- Web research: confirm Huawei MA5600 CLI patterns for:
  - Parsing `display ont autofind all`
  - Querying used ONT IDs on a port (e.g., `display ont info ...`, `display ont brief ...`)
  - Querying used service-port IDs (e.g., `display service-port all` or filtered forms)
  - Prompt patterns (`Username:`, `Password:`, `>`, `#`, `(config)#`, pagination `---- More ----`)
- Build a standalone Python script (`poc_telnet.py`):
  - Connect (IP:23), login, `enable`, `config`
  - Run autofind; capture raw output; parse into structured list
  - For a chosen `gpon 0/X/Y`:
    - Determine next ONT ID (scan existing IDs; pick smallest free in range)
    - Determine next service-port ID (scan existing; pick next free per strategy)
  - Execute:
    - `interface gpon 0/X/Y`
    - `ont add 0 <ONT_ID> sn-auth "<SN>" omci ont-lineprofile-id <L> ont-srvprofile-id <S> desc "<DESC>"`
    - `service-port <SP_ID> vlan <V> gpon 0/X/Y ont <ONT_ID> gemport <G> multi-service user-vlan <UV> tag-transform translate`
  - Handle pagination, timeouts, command echo, and success/failure detection.
- Iterate until script is reliable with real OLT outputs (user runs in-network, shares anonymized outputs if needed).
- Produce a small “integration playbook” doc in-repo: required OLT permissions, expected prompts, known error strings.

**Exit criteria (must pass)**
- POC successfully registers ONT + service-port at least 3 times with different SNs/ports.
- Auto-detection avoids collisions; failures are reported with actionable message.

---

### Phase 2 — V1 App Development (MVP without auth first)
**User stories**
1. As an operator, I want to add an OLT connection (IP/port/user/pass) and test connectivity so I know it’s reachable.
2. As an operator, I want to create a registration profile (line/srv profile IDs, VLANs, gemport, user-vlan, desc template) so I can reuse settings.
3. As an operator, I want to click “Find New ONT devices” and see a table of discovered ONTs so I can choose targets.
4. As an operator, I want to select discovered ONTs + choose a reg profile and run “1-Click Register” so provisioning is fast.
5. As an operator, I want to see a per-ONT result (success/fail + raw CLI snippet) so I can troubleshoot quickly.

**Backend (FastAPI)**
- Implement Telnet service module using the proven POC logic (refactor into reusable functions):
  - `telnet_connect()`, `run_cmd()`, `run_cmd_paged()`, parsers.
- MongoDB collections:
  - `olts` (ip, port, username, password_encrypted)
  - `reg_profiles` (name, olt_id, pon_type, line_profile_id, srv_profile_id, vlan, gemport, user_vlan, desc_template, status)
  - `discoveries` (olt_id, collected_at, raw_output, parsed_rows[])
  - `registrations` (olt_id, profile_id, pon, sn, ont_id, service_port_id, executed_at, result, raw_log)
- API endpoints (minimal):
  - OLT: CRUD + `POST /olts/{id}/test`
  - Profiles: CRUD
  - Discovery: `POST /olts/{id}/autofind` + `GET /discoveries/{id}`
  - Register: `POST /register` (payload: discovery_ids or explicit SN rows + profile_id + pon)
- Error model: standard error codes for telnet auth fail, timeout, parsing fail, command reject.

**Frontend (React + shadcn)**
- Layout similar to reference:
  - Top header (system name, user placeholder, logout disabled)
  - Left sidebar (Application → OLT/ONU Manage)
  - Tabs: focus on **ONT Register** for V1
- Screens/components:
  - OLT list + add/edit dialog + “Test Connection”
  - Register Profile table + new/edit dialog
  - ONT Automatic Discovery table with:
    - “Choose Reg Profile” dropdown
    - “Find New ONT devices” button
    - “1-Click Register” button
    - Row selection + batch action results panel
- UX states: loading, telnet in-progress, partial failures, retry.

**Testing (end of phase)**
- One end-to-end run in dev with mock telnet disabled; provide a “dry-run mode” that prints commands if no OLT reachable.
- In-network validation checklist for user to run against real OLT.

---

### Phase 3 — Authentication + Logging hardening
**User stories**
1. As an admin, I want user registration/login so only authorized staff can access the tool.
2. As an admin, I want roles (Admin/Operator) so I can restrict profile/OLT edits.
3. As an operator, I want every registration action logged with username + timestamp so audits are easy.
4. As an operator, I want to view registration history and filter by SN/OLT/date so I can trace changes.
5. As an admin, I want credentials stored securely so OLT passwords aren’t exposed.

**Steps**
- Implement JWT auth (FastAPI) + password hashing; role-based guards on endpoints.
- Add `users` collection; attach `created_by`/`executed_by` to entities.
- Encrypt OLT passwords at rest (app-level symmetric encryption via env key).
- Add “Registration Logs” page (table + filters + detail drawer with raw CLI log).
- Add basic rate limiting / concurrency guard per OLT (single telnet session at a time).

**Testing (end of phase)**
- E2E test: login → discover → register → verify log attribution.

---

### Phase 4 — Reliability upgrades (post-V1)
**User stories**
1. As an operator, I want queued registrations so batch actions don’t overload Telnet.
2. As an operator, I want retries/backoff on transient telnet errors so fewer manual reruns are needed.
3. As an operator, I want per-command timing + debug mode so I can diagnose slow OLT responses.
4. As an admin, I want configuration for command timeouts/paging so it works across OLT variants.
5. As an operator, I want safer “pre-checks” (existing SN, used VLAN/service-port) to reduce mistakes.

**Steps**
- Add background job queue (simple in-process first; optional Celery later).
- Add pre-check commands: SN existence, ONT ID availability, service-port availability.
- Improve parsers with fixtures (store anonymized CLI outputs as test vectors).

## 3. Next Actions
1. Collect from user: a few **real raw outputs** (anonymized) for:
   - successful login prompt sequence
   - `display ont autofind all`
   - command to list existing ONTs on a port
   - command to list service-ports
2. Run web research to confirm best commands for ONT/service-port scanning on MA5600 R015/R018.
3. Implement `poc_telnet.py` and iterate until real OLT run is stable.
4. Once POC passes, start Phase 2 V1 app build.

## 4. Success Criteria
- POC: reliably completes (autofind → ont add → service-port) with correct auto IDs and clear error reporting.
- V1: UI can discover ONTs, select reg profile, and run 1-click register with per-ONT results.
- Auth phase: all registrations are attributed to a user with immutable timestamped logs.
- No credential leakage in UI/API responses; telnet failures are handled without crashing the server.
