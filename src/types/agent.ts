export const AGENT_FRAMEWORKS = [
  'n8n',
  'LangGraph',
  'CrewAI',
  'Google ADK',
  'OpenAI Agents SDK',
  'custom Python',
] as const;

export type AgentFramework = (typeof AGENT_FRAMEWORKS)[number];

export const SCHEMA_LIMITS = {
  ID_MAX: 128,
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  DISPLAY_NAME_MAX: 100,
  EMAIL_MAX: 254,
  PHOTO_URL_MAX: 500,
  AGENT_NAME_MIN: 1,
  AGENT_NAME_MAX: 80,
  AGENT_PURPOSE_MIN: 1,
  AGENT_PURPOSE_MAX: 400,
  VERSION_TAG_MIN: 2,
  VERSION_TAG_MAX: 24,
  VERSION_TAG_PATTERN: /^v[0-9]+(\.[0-9]+){0,2}$/,
  VERSION_NUMBER_MIN: 1,
  VERSION_NUMBER_MAX: 10000,
  RELEASE_DATE_PATTERN: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
  CHANGELOG_MIN: 1,
  CHANGELOG_MAX: 1000,
  PROMPT_CHANGES_MIN: 1,
  PROMPT_CHANGES_MAX: 2000,
  SYSTEM_PROMPT_MAX: 8000,
  TOOL_CHANGES_MIN: 1,
  TOOL_CHANGES_MAX: 2000,
  TOOLS_MAX_COUNT: 20,
  TOOL_ITEM_MAX: 120,
} as const;

export interface AgentRecord {
  id: string;
  ownerId: string;
  name: string;
  purpose: string;
  framework: AgentFramework;
  latestVersionTag: string;
  versionCount: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface AgentVersionRecord {
  id: string;
  ownerId: string;
  agentId: string;
  versionTag: string;
  versionNumber: number;
  releaseDate: string;
  changelog: string;
  promptChanges: string;
  systemPrompt: string;
  toolChanges: string;
  tools: string[];
  createdAtMs: number;
  updatedAtMs: number;
}

export interface AgentFormValues {
  name: string;
  purpose: string;
  framework: AgentFramework;
}

export interface VersionFormValues {
  versionTag: string;
  releaseDate: string;
  changelog: string;
  promptChanges: string;
  systemPrompt: string;
  toolChanges: string;
  tools: string[];
}

export function sanitizeText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function sanitizeMultiline(value: string, maxLength: number): string {
  return value.replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

export function parseVersionNumber(tag: string, fallback: number): number {
  const match = tag.trim().match(/^v([0-9]+)(?:\.([0-9]+))?(?:\.([0-9]+))?$/);
  if (!match) {
    return Math.min(Math.max(fallback, SCHEMA_LIMITS.VERSION_NUMBER_MIN), SCHEMA_LIMITS.VERSION_NUMBER_MAX);
  }
  const major = Number.parseInt(match[1] ?? '1', 10);
  const minor = Number.parseInt(match[2] ?? '0', 10);
  const patch = Number.parseInt(match[3] ?? '0', 10);
  const computed = major * 100 + minor * 10 + patch;
  return Math.min(Math.max(computed, SCHEMA_LIMITS.VERSION_NUMBER_MIN), SCHEMA_LIMITS.VERSION_NUMBER_MAX);
}

export function suggestNextVersionTag(existingVersions: AgentVersionRecord[]): string {
  if (existingVersions.length === 0) {
    return 'v1';
  }
  let maxMajor = 0;
  for (const version of existingVersions) {
    const match = version.versionTag.match(/^v([0-9]+)/);
    if (match) {
      const major = Number.parseInt(match[1], 10);
      if (major > maxMajor) {
        maxMajor = major;
      }
    }
  }
  return `v${maxMajor + 1}`;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function validateAgentForm(values: AgentFormValues): string | null {
  const name = values.name.trim();
  const purpose = values.purpose.trim();
  if (name.length < SCHEMA_LIMITS.AGENT_NAME_MIN || name.length > SCHEMA_LIMITS.AGENT_NAME_MAX) {
    return `Agent name must be between 1 and ${SCHEMA_LIMITS.AGENT_NAME_MAX} characters.`;
  }
  if (purpose.length < SCHEMA_LIMITS.AGENT_PURPOSE_MIN || purpose.length > SCHEMA_LIMITS.AGENT_PURPOSE_MAX) {
    return `Agent purpose must be between 1 and ${SCHEMA_LIMITS.AGENT_PURPOSE_MAX} characters.`;
  }
  if (!AGENT_FRAMEWORKS.includes(values.framework)) {
    return 'Please select a valid framework.';
  }
  return null;
}

export function validateVersionForm(values: VersionFormValues): string | null {
  const tag = values.versionTag.trim();
  if (
    tag.length < SCHEMA_LIMITS.VERSION_TAG_MIN ||
    tag.length > SCHEMA_LIMITS.VERSION_TAG_MAX ||
    !SCHEMA_LIMITS.VERSION_TAG_PATTERN.test(tag)
  ) {
    return 'Version tag must follow the format v1, v2, or v1.2.';
  }
  if (!SCHEMA_LIMITS.RELEASE_DATE_PATTERN.test(values.releaseDate.trim())) {
    return 'Release date must use YYYY-MM-DD format.';
  }
  if (values.changelog.trim().length < SCHEMA_LIMITS.CHANGELOG_MIN) {
    return 'Changelog summary is required.';
  }
  if (values.promptChanges.trim().length < SCHEMA_LIMITS.PROMPT_CHANGES_MIN) {
    return 'Prompt changes description is required.';
  }
  if (values.toolChanges.trim().length < SCHEMA_LIMITS.TOOL_CHANGES_MIN) {
    return 'Tool changes description is required.';
  }
  return null;
}
