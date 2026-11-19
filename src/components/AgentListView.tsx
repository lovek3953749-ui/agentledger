import { useMemo, useState } from 'react';
import {
  ChevronRight,
  Database,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  AGENT_FRAMEWORKS,
  AgentFramework,
  AgentRecord,
} from '../types/agent';

interface AgentListViewProps {
  agents: AgentRecord[];
  loading: boolean;
  onSelectAgent: (agentId: string) => void;
  onCreateAgent: () => void;
  onEditAgent: (agent: AgentRecord) => void;
  onDeleteAgent: (agent: AgentRecord) => Promise<void>;
  onSeedStarterAgents: () => Promise<void>;
}

function formatUpdatedDate(epochMs: number): string {
  const date = new Date(epochMs);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AgentListView({
  agents,
  loading,
  onSelectAgent,
  onCreateAgent,
  onEditAgent,
  onDeleteAgent,
  onSeedStarterAgents,
}: AgentListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState<'all' | AgentFramework>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const filteredAgents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return agents.filter((agent) => {
      if (frameworkFilter !== 'all' && agent.framework !== frameworkFilter) {
        return false;
      }
      if (!q) return true;
      return (
        agent.name.toLowerCase().includes(q) ||
        agent.purpose.toLowerCase().includes(q) ||
        agent.framework.toLowerCase().includes(q)
      );
    });
  }, [agents, searchQuery, frameworkFilter]);

  const totalVersions = useMemo(
    () => agents.reduce((sum, item) => sum + item.versionCount, 0),
    [agents]
  );

  const activeFrameworksCount = useMemo(
    () => new Set(agents.map((item) => item.framework)).size,
    [agents]
  );

  const handleConfirmDelete = async (agent: AgentRecord) => {
    setDeletingId(agent.id);
    try {
      await onDeleteAgent(agent);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onSeedStarterAgents();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-balance">
            Agent Registry
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track your AI agents, orchestration frameworks, and release history across versions.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-500 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 shrink-0">
          <div>
            <span className="block text-slate-400">Agents</span>
            <span className="text-base font-semibold font-mono tabular-nums text-slate-900">
              {agents.length}
            </span>
          </div>
          <div className="h-7 w-px bg-slate-200" aria-hidden="true" />
          <div>
            <span className="block text-slate-400">Frameworks</span>
            <span className="text-base font-semibold font-mono tabular-nums text-slate-900">
              {activeFrameworksCount}
            </span>
          </div>
          <div className="h-7 w-px bg-slate-200" aria-hidden="true" />
          <div>
            <span className="block text-slate-400">Versions</span>
            <span className="text-base font-semibold font-mono tabular-nums text-slate-900">
              {totalVersions}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents by name, purpose, or framework..."
            aria-label="Search agents"
            className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto"
          role="group"
          aria-label="Filter by framework"
        >
          <button
            type="button"
            onClick={() => setFrameworkFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              frameworkFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          {AGENT_FRAMEWORKS.map((fw) => (
            <button
              key={fw}
              type="button"
              onClick={() => setFrameworkFilter(fw)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                frameworkFilter === fw
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {fw}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-200">
            {[1, 2, 3].map((row) => (
              <div key={row} className="px-6 py-4 flex items-center justify-between gap-4 animate-pulse">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 bg-slate-200 rounded" />
                  <div className="h-3 w-96 max-w-full bg-slate-100 rounded" />
                </div>
                <div className="h-4 w-24 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State (No Agents Created Yet) */}
      {!loading && agents.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-base font-semibold text-slate-900 mb-2">
              No AI agents registered yet
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Create your first agent to track its framework, purpose, and versioned prompt and tool changes, or load three sample agents to explore the workflow.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onCreateAgent}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                Create First Agent
              </button>
              <button
                type="button"
                onClick={handleSeed}
                disabled={seeding}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Database className="w-4 h-4" />
                {seeding ? 'Loading Samples...' : 'Load Starter Agents'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Filter State */}
      {!loading && agents.length > 0 && filteredAgents.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-slate-900 mb-1">
            No matching agents found
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Try clearing your search query or switching the framework filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFrameworkFilter('all');
            }}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Populated Agent Table */}
      {!loading && filteredAgents.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-5">Agent &amp; Purpose</th>
                  <th className="py-3 px-4 whitespace-nowrap">Framework</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Latest</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Versions</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Updated</th>
                  <th className="py-3 px-5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredAgents.map((agent) => {
                  const isConfirming = confirmDeleteId === agent.id;
                  const isDeleting = deletingId === agent.id;

                  return (
                    <tr
                      key={agent.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3.5 px-5 max-w-md">
                        <button
                          type="button"
                          onClick={() => onSelectAgent(agent.id)}
                          className="text-left block w-full focus:outline-none group-hover:text-blue-600"
                        >
                          <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            <span className="truncate">{agent.name}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                          </span>
                          <span className="block text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {agent.purpose}
                          </span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-slate-700">
                        {agent.framework}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs tabular-nums text-slate-900">
                        {agent.latestVersionTag}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs tabular-nums text-slate-600">
                        {agent.versionCount}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs tabular-nums text-slate-500">
                        {formatUpdatedDate(agent.updatedAtMs)}
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {isConfirming ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(agent)}
                              disabled={isDeleting}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors whitespace-nowrap shrink-0"
                            >
                              {isDeleting ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded transition-colors whitespace-nowrap shrink-0"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditAgent(agent)}
                              aria-label={`Edit ${agent.name}`}
                              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(agent.id)}
                              aria-label={`Delete ${agent.name}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
