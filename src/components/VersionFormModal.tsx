import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  AgentVersionRecord,
  SCHEMA_LIMITS,
  VersionFormValues,
  getTodayIsoDate,
  suggestNextVersionTag,
  validateVersionForm,
} from '../types/agent';

interface VersionFormModalProps {
  open: boolean;
  agentName: string;
  existingVersions: AgentVersionRecord[];
  editingVersion: AgentVersionRecord | null;
  onClose: () => void;
  onSubmit: (values: VersionFormValues) => Promise<void>;
}

const TOOL_STATUS_OPTIONS = ['Added', 'Modified', 'Active', 'Removed'] as const;

export function VersionFormModal({
  open,
  agentName,
  existingVersions,
  editingVersion,
  onClose,
  onSubmit,
}: VersionFormModalProps) {
  const [versionTag, setVersionTag] = useState('v1');
  const [releaseDate, setReleaseDate] = useState(getTodayIsoDate());
  const [changelog, setChangelog] = useState('');
  const [promptChanges, setPromptChanges] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [toolChanges, setToolChanges] = useState('');
  const [tools, setTools] = useState<string[]>([]);
  const [newToolName, setNewToolName] = useState('');
  const [newToolStatus, setNewToolStatus] = useState<(typeof TOOL_STATUS_OPTIONS)[number]>('Added');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNewToolName('');
    setNewToolStatus('Added');

    if (editingVersion) {
      setVersionTag(editingVersion.versionTag);
      setReleaseDate(editingVersion.releaseDate);
      setChangelog(editingVersion.changelog);
      setPromptChanges(editingVersion.promptChanges);
      setSystemPrompt(editingVersion.systemPrompt);
      setToolChanges(editingVersion.toolChanges);
      setTools(editingVersion.tools);
    } else {
      const latest = existingVersions[0];
      setVersionTag(suggestNextVersionTag(existingVersions));
      setReleaseDate(getTodayIsoDate());
      setChangelog('');
      setPromptChanges('');
      setSystemPrompt(latest?.systemPrompt ?? '');
      setToolChanges('');
      setTools(
        latest
          ? latest.tools
              .filter((t) => !t.endsWith('(Removed)'))
              .map((t) => t.replace(/\s*\((Added|Modified|Active)\)$/, ' (Active)'))
          : []
      );
    }
  }, [open, editingVersion, existingVersions]);

  if (!open) return null;

  const handleAddTool = () => {
    const cleanName = newToolName.trim();
    if (!cleanName) return;
    if (tools.length >= SCHEMA_LIMITS.TOOLS_MAX_COUNT) {
      setError(`Maximum of ${SCHEMA_LIMITS.TOOLS_MAX_COUNT} tools per version.`);
      return;
    }
    const entry = `${cleanName} (${newToolStatus})`.slice(0, SCHEMA_LIMITS.TOOL_ITEM_MAX);
    setTools((prev) => [...prev, entry]);
    setNewToolName('');
    setError(null);
  };

  const handleRemoveTool = (index: number) => {
    setTools((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const values: VersionFormValues = {
      versionTag,
      releaseDate,
      changelog,
      promptChanges,
      systemPrompt,
      toolChanges,
      tools,
    };
    const validation = validateVersionForm(values);
    if (validation) {
      setError(validation);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save version.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 id="version-modal-title" className="text-base font-semibold text-slate-900">
              {editingVersion ? `Edit ${editingVersion.versionTag}` : `New Version for ${agentName}`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Document changelog notes, prompt revisions, and tool updates.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="version-tag" className="block text-xs font-medium text-slate-700 mb-1.5">
                Version Tag
              </label>
              <input
                id="version-tag"
                type="text"
                required
                maxLength={SCHEMA_LIMITS.VERSION_TAG_MAX}
                value={versionTag}
                onChange={(e) => setVersionTag(e.target.value)}
                placeholder="v1, v2, v2.1"
                className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label htmlFor="version-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                Release Date
              </label>
              <input
                id="version-date"
                type="date"
                required
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="version-changelog" className="block text-xs font-medium text-slate-700 mb-1.5">
              Changelog Summary
            </label>
            <textarea
              id="version-changelog"
              required
              rows={2}
              maxLength={SCHEMA_LIMITS.CHANGELOG_MAX}
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="What changed in this release and why?"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
            />
          </div>

          <div>
            <label htmlFor="version-prompt-changes" className="block text-xs font-medium text-slate-700 mb-1.5">
              Prompt Changes
            </label>
            <textarea
              id="version-prompt-changes"
              required
              rows={2}
              maxLength={SCHEMA_LIMITS.PROMPT_CHANGES_MAX}
              value={promptChanges}
              onChange={(e) => setPromptChanges(e.target.value)}
              placeholder="Summarize system prompt edits, constraints added, or reasoning steps adjusted..."
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="version-system-prompt" className="block text-xs font-medium text-slate-700">
                System Prompt Snapshot
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {systemPrompt.length}/{SCHEMA_LIMITS.SYSTEM_PROMPT_MAX}
              </span>
            </div>
            <textarea
              id="version-system-prompt"
              rows={4}
              maxLength={SCHEMA_LIMITS.SYSTEM_PROMPT_MAX}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Full prompt template for this version (used for inspection and future diffs)..."
              className="w-full px-3 py-2 text-xs font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
            />
          </div>

          <div>
            <label htmlFor="version-tool-changes" className="block text-xs font-medium text-slate-700 mb-1.5">
              Tool Changes Summary
            </label>
            <textarea
              id="version-tool-changes"
              required
              rows={2}
              maxLength={SCHEMA_LIMITS.TOOL_CHANGES_MAX}
              value={toolChanges}
              onChange={(e) => setToolChanges(e.target.value)}
              placeholder="Describe tools added, updated, or deprecated in this version..."
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700">
                Tool Inventory ({tools.length}/{SCHEMA_LIMITS.TOOLS_MAX_COUNT})
              </span>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2 mb-3">
              <input
                type="text"
                value={newToolName}
                onChange={(e) => setNewToolName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTool();
                  }
                }}
                maxLength={90}
                placeholder="Tool name (e.g., lookup_customer_account)"
                className="flex-1 min-w-0 px-3 py-1.5 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              <select
                value={newToolStatus}
                onChange={(e) =>
                  setNewToolStatus(e.target.value as (typeof TOOL_STATUS_OPTIONS)[number])
                }
                aria-label="Tool change status"
                className="px-3 py-1.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                {TOOL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddTool}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Tool
              </button>
            </div>

            {tools.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                {tools.map((tool, index) => (
                  <div
                    key={`${tool}-${index}`}
                    className="px-3 py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="font-mono text-slate-800 truncate">{tool}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTool(index)}
                      aria-label={`Remove ${tool}`}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {submitting
                ? 'Saving...'
                : editingVersion
                  ? 'Update Version'
                  : 'Publish Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
