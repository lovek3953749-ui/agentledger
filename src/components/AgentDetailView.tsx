import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { AgentRecord, AgentVersionRecord } from '../types/agent';

interface AgentDetailViewProps {
  agent: AgentRecord;
  versions: AgentVersionRecord[];
  versionsLoading: boolean;
  onBack: () => void;
  onEditAgent: (agent: AgentRecord) => void;
  onDeleteAgent: (agent: AgentRecord) => Promise<void>;
  onCreateVersion: () => void;
  onEditVersion: (version: AgentVersionRecord) => void;
  onDeleteVersion: (version: AgentVersionRecord) => Promise<void>;
}

function getToolStatusColor(toolEntry: string): string {
  if (toolEntry.endsWith('(Added)')) return 'text-emerald-700';
  if (toolEntry.endsWith('(Modified)')) return 'text-amber-700';
  if (toolEntry.endsWith('(Removed)')) return 'text-red-700';
  return 'text-slate-600';
}

export function AgentDetailView({
  agent,
  versions,
  versionsLoading,
  onBack,
  onEditAgent,
  onDeleteAgent,
  onCreateVersion,
  onEditVersion,
  onDeleteVersion,
}: AgentDetailViewProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [confirmDeleteAgent, setConfirmDeleteAgent] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState(false);
  const [confirmDeleteVersionId, setConfirmDeleteVersionId] = useState<string | null>(null);
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    if (versions.length === 0) {
      setSelectedVersionId(null);
      return;
    }
    const stillExists = versions.some((v) => v.id === selectedVersionId);
    if (!stillExists) {
      setSelectedVersionId(versions[0].id);
    }
  }, [versions, selectedVersionId]);

  const selectedVersion = useMemo(
    () => versions.find((v) => v.id === selectedVersionId) ?? versions[0] ?? null,
    [versions, selectedVersionId]
  );

  const handleDeleteAgentClick = async () => {
    setDeletingAgent(true);
    try {
      await onDeleteAgent(agent);
    } finally {
      setDeletingAgent(false);
    }
  };

  const handleDeleteVersionClick = async (version: AgentVersionRecord) => {
    setDeletingVersionId(version.id);
    try {
      await onDeleteVersion(version);
      setConfirmDeleteVersionId(null);
    } finally {
      setDeletingVersionId(null);
    }
  };

  const handleCopyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Back Link */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Agent Registry
        </button>
      </div>

      {/* Agent Overview Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{agent.framework}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">Latest {agent.latestVersionTag}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {versions.length} {versions.length === 1 ? 'version' : 'versions'}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-balance">
              {agent.name}
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed">
              {agent.purpose}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onEditAgent(agent)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Agent
            </button>

            {confirmDeleteAgent ? (
              <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                <button
                  type="button"
                  onClick={handleDeleteAgentClick}
                  disabled={deletingAgent}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  {deletingAgent ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAgent(false)}
                  className="px-2 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteAgent(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 bg-white border border-slate-300 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}

            <button
              type="button"
              onClick={onCreateVersion}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              New Version
            </button>
          </div>
        </div>
      </section>

      {/* Versions Loading */}
      {versionsLoading && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 animate-pulse">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="h-24 w-full bg-slate-100 rounded" />
        </div>
      )}

      {/* Versions Empty State */}
      {!versionsLoading && versions.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-base font-semibold text-slate-900 mb-2">
              No versions logged for {agent.name}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Record v1 with its release date, changelog summary, prompt changes, and configured tools to begin tracking iterations.
            </p>
            <button
              type="button"
              onClick={onCreateVersion}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Publish v1
            </button>
          </div>
        </div>
      )}

      {/* Versions Split Workspace */}
      {!versionsLoading && versions.length > 0 && selectedVersion && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Version History List */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Version History
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {versions.length} {versions.length === 1 ? 'release' : 'releases'}
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {versions.map((ver, index) => {
                const isSelected = ver.id === selectedVersion.id;
                return (
                  <button
                    key={ver.id}
                    type="button"
                    onClick={() => setSelectedVersionId(ver.id)}
                    className={`w-full text-left px-5 py-4 transition-colors block ${
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-sm font-semibold tabular-nums ${
                            isSelected ? 'text-blue-700' : 'text-slate-900'
                          }`}
                        >
                          {ver.versionTag}
                        </span>
                        {index === 0 && (
                          <span className="text-xs font-medium text-blue-600">
                            · Latest
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {ver.releaseDate}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {ver.changelog}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Version Inspector */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold font-mono tabular-nums text-slate-900">
                    {selectedVersion.versionTag}
                  </h2>
                  <span className="text-xs text-slate-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    Released {selectedVersion.releaseDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onEditVersion(selectedVersion)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Version
                </button>

                {confirmDeleteVersionId === selectedVersion.id ? (
                  <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteVersionClick(selectedVersion)}
                      disabled={deletingVersionId === selectedVersion.id}
                      className="px-2 py-0.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors whitespace-nowrap shrink-0"
                    >
                      {deletingVersionId === selectedVersion.id ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteVersionId(null)}
                      className="px-2 py-0.5 text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteVersionId(selectedVersion.id)}
                    aria-label={`Delete ${selectedVersion.versionTag}`}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Changelog Section */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-1.5">
                  Changelog
                </h3>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedVersion.changelog}
                </p>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h3 className="text-xs font-semibold text-slate-500 mb-1.5">
                  Prompt Changes
                </h3>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap mb-4">
                  {selectedVersion.promptChanges}
                </p>

                {selectedVersion.systemPrompt && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-500">
                        System Prompt Snapshot
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPrompt(selectedVersion.systemPrompt)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Prompt
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                      {selectedVersion.systemPrompt}
                    </pre>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h3 className="text-xs font-semibold text-slate-500 mb-1.5">
                  Tool Changes
                </h3>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap mb-4">
                  {selectedVersion.toolChanges}
                </p>

                {selectedVersion.tools.length > 0 && (
                  <div>
                    <span className="block text-xs font-medium text-slate-500 mb-2">
                      Configured Tools ({selectedVersion.tools.length})
                    </span>
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                      {selectedVersion.tools.map((toolEntry, idx) => (
                        <div
                          key={`${toolEntry}-${idx}`}
                          className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs"
                        >
                          <span className="font-mono text-slate-800">
                            {toolEntry.replace(/\s*\((Added|Modified|Active|Removed)\)$/, '')}
                          </span>
                          <span
                            className={`font-medium whitespace-nowrap shrink-0 ${getToolStatusColor(
                              toolEntry
                            )}`}
                          >
                            {toolEntry.match(/\((Added|Modified|Active|Removed)\)$/)?.[1] ?? 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
