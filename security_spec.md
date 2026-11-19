# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **User Isolation (PII Protection)**: A user document at `/users/{userId}` can only be read (`get`) or written by the authenticated user whose `request.auth.uid == userId` and `request.auth.token.email_verified == true`. Listing `/users` is strictly forbidden.
2. **Agent Ownership**: Every `/agents/{agentId}` document MUST have `ownerId == request.auth.uid`. `ownerId` and `createdAt` are immutable after creation.
3. **Framework Enum Integrity**: `framework` on `/agents/{agentId}` MUST be one of: `n8n`, `LangGraph`, `CrewAI`, `Google ADK`, `OpenAI Agents SDK`, `custom Python`.
4. **Master Gate & Relational Sync on Versions**: Every `/agents/{agentId}/versions/{versionId}` document MUST belong to an existing (or atomically created) parent agent owned by `request.auth.uid`, and `version.agentId` MUST equal the path `agentId`, and `version.ownerId` MUST equal `request.auth.uid`.
5. **Temporal Integrity**: `createdAt` on create and `updatedAt` on create/update MUST equal `request.time` (server timestamp).
6. **Zero Shadow Fields & Path Hardening**: Every collection enforces strict `keys().hasAll(...)` / `keys().hasOnly(...)` / `affectedKeys().hasOnly(...)` allowlists and `isValidId()` regex guards (`^[a-zA-Z0-9_\-]+$`, max 128 chars).

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Agent Read/Write**: Read or write `/agents/agent_1` with `auth = null`.
2. **Unverified Email Spoof**: Write `/agents/agent_1` with `auth.token.email_verified = false`.
3. **Identity Spoofing on Agent Create**: Create `/agents/agent_1` with `ownerId: "victim_uid"` while signed in as `"attacker_uid"`.
4. **Shadow Field Injection ("Ghost Field")**: Create `/agents/agent_1` with valid fields plus `isAdmin: true` or `tier: "enterprise"`.
5. **Owner Hijack on Agent Update**: Update `/agents/agent_1` attempting to mutate `ownerId` or `createdAt`.
6. **Invalid Framework Enum**: Create `/agents/agent_1` with `framework: "AutoGPT-Fake"`.
7. **Resource Exhaustion / ID Poisoning**: Create `/agents/` with a 200-char ID or invalid characters (`../etc/passwd`), or `purpose` > 400 chars.
8. **Cross-Tenant List Query Bypass**: Attempt `list` on `/agents` without scoping to `ownerId == request.auth.uid` (or querying another user's `ownerId`).
9. **Orphaned Version Write**: Create `/agents/nonexistent_agent/versions/v1` where parent agent does not exist.
10. **Cross-Owner Version Injection**: Create `/agents/victim_agent/versions/v1` under another user's agent.
11. **Mismatched `agentId` in Version Payload**: Create `/agents/agent_1/versions/v1` with `agentId: "agent_2"`.
12. **Client-Forged Timestamp / Unbounded Tools Array**: Create `/agents/agent_1/versions/v1` with client-supplied past `createdAt` or 25 entries in `tools`.
