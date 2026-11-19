import {
  Timestamp,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AGENT_FRAMEWORKS,
  AgentFormValues,
  AgentFramework,
  AgentRecord,
  AgentVersionRecord,
  SCHEMA_LIMITS,
  VersionFormValues,
  parseVersionNumber,
  sanitizeMultiline,
  sanitizeText,
} from '../types/agent';

function createSafeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function toEpochMs(value: unknown): number {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return (value.toMillis as () => number)();
  }
  return Date.now();
}

function sanitizeToolsList(tools: string[]): string[] {
  return tools
    .map((item) => sanitizeText(item, SCHEMA_LIMITS.TOOL_ITEM_MAX))
    .filter((item) => item.length > 0)
    .slice(0, SCHEMA_LIMITS.TOOLS_MAX_COUNT);
}

function normalizeFramework(value: unknown): AgentFramework {
  if (typeof value === 'string' && (AGENT_FRAMEWORKS as readonly string[]).includes(value)) {
    return value as AgentFramework;
  }
  return 'custom Python';
}

export function subscribeToAgents(
  ownerId: string,
  onData: (agents: AgentRecord[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'agents';
  const q = query(collection(db, path), where('ownerId', '==', ownerId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: AgentRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ownerId: String(data.ownerId ?? ''),
          name: String(data.name ?? ''),
          purpose: String(data.purpose ?? ''),
          framework: normalizeFramework(data.framework),
          latestVersionTag: String(data.latestVersionTag ?? 'v0'),
          versionCount: typeof data.versionCount === 'number' ? data.versionCount : 0,
          createdAtMs: toEpochMs(data.createdAt),
          updatedAtMs: toEpochMs(data.updatedAt),
        };
      });
      items.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToAgentVersions(
  agentId: string,
  ownerId: string,
  onData: (versions: AgentVersionRecord[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = `agents/${agentId}/versions`;
  const q = query(collection(db, 'agents', agentId, 'versions'), where('ownerId', '==', ownerId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: AgentVersionRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ownerId: String(data.ownerId ?? ''),
          agentId: String(data.agentId ?? agentId),
          versionTag: String(data.versionTag ?? 'v1'),
          versionNumber: typeof data.versionNumber === 'number' ? data.versionNumber : 1,
          releaseDate: String(data.releaseDate ?? ''),
          changelog: String(data.changelog ?? ''),
          promptChanges: String(data.promptChanges ?? ''),
          systemPrompt: String(data.systemPrompt ?? ''),
          toolChanges: String(data.toolChanges ?? ''),
          tools: Array.isArray(data.tools) ? data.tools.map(String) : [],
          createdAtMs: toEpochMs(data.createdAt),
          updatedAtMs: toEpochMs(data.updatedAt),
        };
      });
      items.sort((a, b) => b.versionNumber - a.versionNumber || b.createdAtMs - a.createdAtMs);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createAgent(
  ownerId: string,
  values: AgentFormValues,
  initialVersion?: VersionFormValues
): Promise<string> {
  const agentId = createSafeId();
  const agentPath = `agents/${agentId}`;
  const batch = writeBatch(db);
  const agentRef = doc(db, 'agents', agentId);

  const hasInitialVersion = Boolean(initialVersion);
  const initialTag = initialVersion
    ? sanitizeText(initialVersion.versionTag, SCHEMA_LIMITS.VERSION_TAG_MAX)
    : 'v0';

  batch.set(agentRef, {
    ownerId,
    name: sanitizeText(values.name, SCHEMA_LIMITS.AGENT_NAME_MAX),
    purpose: sanitizeMultiline(values.purpose, SCHEMA_LIMITS.AGENT_PURPOSE_MAX),
    framework: values.framework,
    latestVersionTag: initialTag,
    versionCount: hasInitialVersion ? 1 : 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (initialVersion) {
    const versionId = createSafeId();
    const versionRef = doc(db, 'agents', agentId, 'versions', versionId);
    const cleanTag = sanitizeText(initialVersion.versionTag, SCHEMA_LIMITS.VERSION_TAG_MAX);
    batch.set(versionRef, {
      ownerId,
      agentId,
      versionTag: cleanTag,
      versionNumber: parseVersionNumber(cleanTag, 1),
      releaseDate: sanitizeText(initialVersion.releaseDate, 10),
      changelog: sanitizeMultiline(initialVersion.changelog, SCHEMA_LIMITS.CHANGELOG_MAX),
      promptChanges: sanitizeMultiline(initialVersion.promptChanges, SCHEMA_LIMITS.PROMPT_CHANGES_MAX),
      systemPrompt: sanitizeMultiline(initialVersion.systemPrompt, SCHEMA_LIMITS.SYSTEM_PROMPT_MAX),
      toolChanges: sanitizeMultiline(initialVersion.toolChanges, SCHEMA_LIMITS.TOOL_CHANGES_MAX),
      tools: sanitizeToolsList(initialVersion.tools),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return agentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, agentPath);
  }
}

export async function updateAgent(agentId: string, values: AgentFormValues): Promise<void> {
  const agentPath = `agents/${agentId}`;
  try {
    await updateDoc(doc(db, 'agents', agentId), {
      name: sanitizeText(values.name, SCHEMA_LIMITS.AGENT_NAME_MAX),
      purpose: sanitizeMultiline(values.purpose, SCHEMA_LIMITS.AGENT_PURPOSE_MAX),
      framework: values.framework,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, agentPath);
  }
}

export async function deleteAgent(agentId: string, ownerId: string): Promise<void> {
  const agentPath = `agents/${agentId}`;
  try {
    const versionsSnap = await getDocs(
      query(collection(db, 'agents', agentId, 'versions'), where('ownerId', '==', ownerId))
    );
    const batch = writeBatch(db);
    versionsSnap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    batch.delete(doc(db, 'agents', agentId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, agentPath);
  }
}

export async function createAgentVersion(
  ownerId: string,
  agent: AgentRecord,
  existingVersions: AgentVersionRecord[],
  values: VersionFormValues
): Promise<string> {
  const versionId = createSafeId();
  const versionPath = `agents/${agent.id}/versions/${versionId}`;
  const cleanTag = sanitizeText(values.versionTag, SCHEMA_LIMITS.VERSION_TAG_MAX);
  const nextNumber = parseVersionNumber(cleanTag, existingVersions.length + 1);

  const highestExistingNumber = existingVersions.reduce(
    (max, item) => Math.max(max, item.versionNumber),
    0
  );
  const newLatestTag =
    nextNumber >= highestExistingNumber ? cleanTag : agent.latestVersionTag;

  const batch = writeBatch(db);
  batch.set(doc(db, 'agents', agent.id, 'versions', versionId), {
    ownerId,
    agentId: agent.id,
    versionTag: cleanTag,
    versionNumber: nextNumber,
    releaseDate: sanitizeText(values.releaseDate, 10),
    changelog: sanitizeMultiline(values.changelog, SCHEMA_LIMITS.CHANGELOG_MAX),
    promptChanges: sanitizeMultiline(values.promptChanges, SCHEMA_LIMITS.PROMPT_CHANGES_MAX),
    systemPrompt: sanitizeMultiline(values.systemPrompt, SCHEMA_LIMITS.SYSTEM_PROMPT_MAX),
    toolChanges: sanitizeMultiline(values.toolChanges, SCHEMA_LIMITS.TOOL_CHANGES_MAX),
    tools: sanitizeToolsList(values.tools),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'agents', agent.id), {
    latestVersionTag: newLatestTag,
    versionCount: existingVersions.length + 1,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return versionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, versionPath);
  }
}

export async function updateAgentVersion(
  agentId: string,
  versionId: string,
  allVersions: AgentVersionRecord[],
  values: VersionFormValues
): Promise<void> {
  const versionPath = `agents/${agentId}/versions/${versionId}`;
  const cleanTag = sanitizeText(values.versionTag, SCHEMA_LIMITS.VERSION_TAG_MAX);
  const versionNumber = parseVersionNumber(cleanTag, 1);

  const updatedVersions = allVersions
    .map((item) =>
      item.id === versionId
        ? { ...item, versionTag: cleanTag, versionNumber }
        : item
    )
    .sort((a, b) => b.versionNumber - a.versionNumber);

  const latestTag = updatedVersions[0]?.versionTag ?? cleanTag;

  const batch = writeBatch(db);
  batch.update(doc(db, 'agents', agentId, 'versions', versionId), {
    versionTag: cleanTag,
    versionNumber,
    releaseDate: sanitizeText(values.releaseDate, 10),
    changelog: sanitizeMultiline(values.changelog, SCHEMA_LIMITS.CHANGELOG_MAX),
    promptChanges: sanitizeMultiline(values.promptChanges, SCHEMA_LIMITS.PROMPT_CHANGES_MAX),
    systemPrompt: sanitizeMultiline(values.systemPrompt, SCHEMA_LIMITS.SYSTEM_PROMPT_MAX),
    toolChanges: sanitizeMultiline(values.toolChanges, SCHEMA_LIMITS.TOOL_CHANGES_MAX),
    tools: sanitizeToolsList(values.tools),
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'agents', agentId), {
    latestVersionTag: latestTag,
    versionCount: allVersions.length,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, versionPath);
  }
}

export async function deleteAgentVersion(
  agentId: string,
  versionId: string,
  allVersions: AgentVersionRecord[]
): Promise<void> {
  const versionPath = `agents/${agentId}/versions/${versionId}`;
  const remaining = allVersions
    .filter((item) => item.id !== versionId)
    .sort((a, b) => b.versionNumber - a.versionNumber);

  const batch = writeBatch(db);
  batch.delete(doc(db, 'agents', agentId, 'versions', versionId));
  batch.update(doc(db, 'agents', agentId), {
    latestVersionTag: remaining[0]?.versionTag ?? 'v0',
    versionCount: remaining.length,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, versionPath);
  }
}

export async function seedStarterAgents(ownerId: string): Promise<void> {
  const batch = writeBatch(db);

  const samples: Array<{
    agent: AgentFormValues;
    versions: VersionFormValues[];
  }> = [
    {
      agent: {
        name: 'Support Triage Router',
        purpose:
          'Classifies inbound customer tickets by urgency, extracts account context, and routes billing or technical incidents to specialized queues.',
        framework: 'LangGraph',
      },
      versions: [
        {
          versionTag: 'v1',
          releaseDate: '2026-10-12',
          changelog: 'Initial triage graph with three priority buckets and basic CRM lookup.',
          promptChanges: 'Created base classification system prompt with JSON schema instructions.',
          systemPrompt:
            'You are a support triage classifier. Inspect the customer message and assign priority (P1, P2, P3) and category (billing, technical, account). Return structured JSON only.',
          toolChanges: 'Added lookup_customer_account tool for plan tier verification.',
          tools: ['lookup_customer_account (Added)', 'assign_queue (Added)'],
        },
        {
          versionTag: 'v2',
          releaseDate: '2026-10-29',
          changelog: 'Reduced false P1 escalations on password reset tickets and added SLA check.',
          promptChanges: 'Added explicit negative examples for P1 outage rules and required evidence citation.',
          systemPrompt:
            'You are a support triage classifier. Assign P1 strictly for production outages affecting multiple users or payment failures. Never mark password resets as P1. Always cite the matched account tier.',
          toolChanges: 'Added check_sla_policy; updated lookup_customer_account to return open incident count.',
          tools: [
            'lookup_customer_account (Modified)',
            'check_sla_policy (Added)',
            'assign_queue (Active)',
          ],
        },
        {
          versionTag: 'v3',
          releaseDate: '2026-11-14',
          changelog: 'Added duplicate ticket detection and automated refund eligibility pre-check.',
          promptChanges: 'Introduced two-step reasoning before routing and tightened fallback instructions when CRM times out.',
          systemPrompt:
            'You are a support triage classifier. First check for duplicate open tickets within 48 hours. Second, verify plan SLA and refund eligibility for billing inquiries before selecting the target queue.',
          toolChanges: 'Added find_similar_tickets and verify_refund_window; removed legacy assign_queue.',
          tools: [
            'lookup_customer_account (Active)',
            'check_sla_policy (Active)',
            'find_similar_tickets (Added)',
            'verify_refund_window (Added)',
            'assign_queue (Removed)',
          ],
        },
      ],
    },
    {
      agent: {
        name: 'Invoice Reconciliation Flow',
        purpose:
          'Extracts vendor line items from PDF invoices, matches purchase orders in ERP, and flags unit price discrepancies before approval.',
        framework: 'n8n',
      },
      versions: [
        {
          versionTag: 'v1',
          releaseDate: '2026-10-20',
          changelog: 'Initial n8n webhook workflow extracting invoice totals and PO numbers.',
          promptChanges: 'Drafted extraction prompt for vendor name, invoice ID, subtotal, tax, and PO reference.',
          systemPrompt:
            'Extract vendor_name, invoice_id, po_number, currency, and line_items from the OCR text. Output strict JSON matching the ERP schema.',
          toolChanges: 'Connected parse_pdf_ocr and erp_get_po nodes.',
          tools: ['parse_pdf_ocr (Added)', 'erp_get_po (Added)'],
        },
        {
          versionTag: 'v2',
          releaseDate: '2026-11-08',
          changelog: 'Handled multi-currency tax rounding and added Slack escalation for >2% variance.',
          promptChanges: 'Added currency normalization rules and explicit handling for credit memos.',
          systemPrompt:
            'Extract vendor_name, invoice_id, po_number, currency, and line_items. Convert credit memos to negative quantities and preserve 2-decimal precision without rounding tax lines.',
          toolChanges: 'Added fx_rate_lookup and notify_finance_slack.',
          tools: [
            'parse_pdf_ocr (Active)',
            'erp_get_po (Active)',
            'fx_rate_lookup (Added)',
            'notify_finance_slack (Added)',
          ],
        },
      ],
    },
    {
      agent: {
        name: 'Competitor Release Analyst',
        purpose:
          'Monitors engineering changelogs and documentation updates weekly, synthesizing structured product briefs for PM review.',
        framework: 'Google ADK',
      },
      versions: [
        {
          versionTag: 'v1',
          releaseDate: '2026-11-02',
          changelog: 'First multi-step ADK pipeline fetching RSS feeds and drafting weekly Markdown briefs.',
          promptChanges: 'Defined analyst persona focused on API surface changes and pricing updates.',
          systemPrompt:
            'Summarize verified product changelog entries into three sections: API Changes, Pricing & Limits, and Deprecations. Omit marketing fluff and cite exact source URLs.',
          toolChanges: 'Added fetch_changelog_feed and write_markdown_brief.',
          tools: ['fetch_changelog_feed (Added)', 'write_markdown_brief (Added)'],
        },
      ],
    },
  ];

  for (const sample of samples) {
    const agentId = createSafeId();
    const agentRef = doc(db, 'agents', agentId);
    const latest = sample.versions[sample.versions.length - 1];

    batch.set(agentRef, {
      ownerId,
      name: sample.agent.name,
      purpose: sample.agent.purpose,
      framework: sample.agent.framework,
      latestVersionTag: latest.versionTag,
      versionCount: sample.versions.length,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (const ver of sample.versions) {
      const versionId = createSafeId();
      const versionRef = doc(db, 'agents', agentId, 'versions', versionId);
      batch.set(versionRef, {
        ownerId,
        agentId,
        versionTag: ver.versionTag,
        versionNumber: parseVersionNumber(ver.versionTag, 1),
        releaseDate: ver.releaseDate,
        changelog: ver.changelog,
        promptChanges: ver.promptChanges,
        systemPrompt: ver.systemPrompt,
        toolChanges: ver.toolChanges,
        tools: ver.tools,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'agents');
  }
}
