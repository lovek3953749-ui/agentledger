import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  AGENT_FRAMEWORKS,
  AgentFormValues,
  AgentFramework,
  AgentRecord,
  SCHEMA_LIMITS,
  VersionFormValues,
  getTodayIsoDate,
  validateAgentForm,
  validateVersionForm,
} from '../types/agent';

interface AgentFormModalProps {
  open: boolean;
  editingAgent: AgentRecord | null;
  onClose: () => void;
  onSubmit: (
    agentValues: AgentFormValues,
    initialVersion?: VersionFormValues
  ) => Promise<void>;
}

export function AgentFormModal({
  open,
  editingAgent,
  onClose,
  onSubmit,
}: AgentFormModalProps) {
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [framework, setFramework] = useState<AgentFramework>('LangGraph');
  const [includeV1, setIncludeV1] = useState(true);
  const [v1Date, setV1Date] = useState(getTodayIsoDate());
  const [v1Changelog, setV1Changelog] = useState('Initial agent release');
  const [v1PromptChanges, setV1PromptChanges] = useState('Defined core system instructions and output format.');
  const [v1SystemPrompt, setV1SystemPrompt] = useState('');
  const [v1ToolChanges, setV1ToolChanges] = useState('Configured baseline toolset.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingAgent) {
      setName(editingAgent.name);
      setPurpose(editingAgent.purpose);
      setFramework(editingAgent.framework);
      setIncludeV1(false);
    } else {
      setName('');
      setPurpose('');
      setFramework('LangGraph');
      setIncludeV1(true);
      setV1Date(getTodayIsoDate());
      setV1Changelog('Initial agent release');
      setV1PromptChanges('Defined core system instructions and output format.');
      setV1SystemPrompt('');
      setV1ToolChanges('Configured baseline toolset.');
    }
  }, [open, editingAgent]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const agentValues: AgentFormValues = { name, purpose, framework };
    const agentValidation = validateAgentForm(agentValues);
    if (agentValidation) {
      setError(agentValidation);
      return;
    }

    let initialVersion: VersionFormValues | undefined;
    if (!editingAgent && includeV1) {
      initialVersion = {
        versionTag: 'v1',
        releaseDate: v1Date,
        changelog: v1Changelog,
        promptChanges: v1PromptChanges,
        systemPrompt: v1SystemPrompt,
        toolChanges: v1ToolChanges,
        tools: [],
      };
      const versionValidation = validateVersionForm(initialVersion);
      if (versionValidation) {
        setError(versionValidation);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(agentValues, initialVersion);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save agent.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 id="agent-modal-title" className="text-base font-semibold text-slate-900">
            {editingAgent ? 'Edit Agent' : 'New AI Agent'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="agent-name" className="block text-xs font-medium text-slate-700 mb-1.5">
              Agent Name
            </label>
            <input
              id="agent-name"
              type="text"
              required
              maxLength={SCHEMA_LIMITS.AGENT_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Support Triage Router"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label htmlFor="agent-framework" className="block text-xs font-medium text-slate-700 mb-1.5">
              Framework
            </label>
            <select
              id="agent-framework"
              value={framework}
              onChange={(e) => setFramework(e.target.value as AgentFramework)}
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              {AGENT_FRAMEWORKS.map((fw) => (
                <option key={fw} value={fw}>
                  {fw}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="agent-purpose" className="block text-xs font-medium text-slate-700">
                Purpose
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {purpose.length}/{SCHEMA_LIMITS.AGENT_PURPOSE_MAX}
              </span>
            </div>
            <textarea
              id="agent-purpose"
              required
              rows={3}
              maxLength={SCHEMA_LIMITS.AGENT_PURPOSE_MAX}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe what tasks this agent handles, inputs it consumes, and expected outcomes."
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
            />
          </div>

          {!editingAgent && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeV1}
                  onChange={(e) => setIncludeV1(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span>Initialize with baseline v1 release</span>
              </label>

              {includeV1 && (
                <div className="space-y-3.5 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="v1-date" className="block text-xs font-medium text-slate-700 mb-1">
                        v1 Release Date
                      </label>
                      <input
                        id="v1-date"
                        type="date"
                        required
                        value={v1Date}
                        onChange={(e) => setV1Date(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label htmlFor="v1-changelog" className="block text-xs font-medium text-slate-700 mb-1">
                        v1 Changelog
                      </label>
                      <input
                        id="v1-changelog"
                        type="text"
                        required
                        maxLength={SCHEMA_LIMITS.CHANGELOG_MAX}
                        value={v1Changelog}
                        onChange={(e) => setV1Changelog(e.target.value)}
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="v1-prompt-changes" className="block text-xs font-medium text-slate-700 mb-1">
                      Initial Prompt Summary
                    </label>
                    <input
                      id="v1-prompt-changes"
                      type="text"
                      required
                      maxLength={SCHEMA_LIMITS.PROMPT_CHANGES_MAX}
                      value={v1PromptChanges}
                      onChange={(e) => setV1PromptChanges(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="v1-system-prompt" className="block text-xs font-medium text-slate-700 mb-1">
                      System Prompt Snapshot (optional)
                    </label>
                    <textarea
                      id="v1-system-prompt"
                      rows={3}
                      maxLength={SCHEMA_LIMITS.SYSTEM_PROMPT_MAX}
                      value={v1SystemPrompt}
                      onChange={(e) => setV1SystemPrompt(e.target.value)}
                      placeholder="Paste the v1 system prompt used by this agent..."
                      className="w-full px-3 py-2 text-xs font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="v1-tool-changes" className="block text-xs font-medium text-slate-700 mb-1">
                      Initial Tool Configuration
                    </label>
                    <input
                      id="v1-tool-changes"
                      type="text"
                      required
                      maxLength={SCHEMA_LIMITS.TOOL_CHANGES_MAX}
                      value={v1ToolChanges}
                      onChange={(e) => setV1ToolChanges(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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
                : editingAgent
                  ? 'Save Changes'
                  : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
