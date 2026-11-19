import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  GitBranch,
  Layers,
  LogOut,
  Menu,
  Plus,
  X,
} from 'lucide-react';
import { AgentDetailView } from './components/AgentDetailView';
import { AgentFormModal } from './components/AgentFormModal';
import { AgentListView } from './components/AgentListView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';
import { VersionFormModal } from './components/VersionFormModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import {
  createAgent,
  createAgentVersion,
  deleteAgent,
  deleteAgentVersion,
  seedStarterAgents,
  subscribeToAgentVersions,
  subscribeToAgents,
  updateAgent,
  updateAgentVersion,
} from './services/agentService';
import {
  AgentFormValues,
  AgentRecord,
  AgentVersionRecord,
  VersionFormValues,
} from './types/agent';

function WorkspaceApp() {
  const { user, authReady, signOutUser } = useAuth();
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const [versions, setVersions] = useState<AgentVersionRecord[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [dataError, setDataError] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AgentVersionRecord | null>(null);

  // Subscribe to user's agents
  useEffect(() => {
    if (!authReady || !user) {
      setAgents([]);
      setAgentsLoading(false);
      setSelectedAgentId(null);
      return;
    }

    setAgentsLoading(true);
    setDataError(null);
    const unsubscribe = subscribeToAgents(
      user.uid,
      (nextAgents) => {
        setAgents(nextAgents);
        setAgentsLoading(false);
      },
      (err) => {
        setDataError(err.message);
        setAgentsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authReady, user]);

  const selectedAgent = useMemo(
    () => agents.find((item) => item.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  );

  // Subscribe to versions for selected agent
  useEffect(() => {
    if (!authReady || !user || !selectedAgentId) {
      setVersions([]);
      setVersionsLoading(false);
      return;
    }

    setVersionsLoading(true);
    const unsubscribe = subscribeToAgentVersions(
      selectedAgentId,
      user.uid,
      (nextVersions) => {
        setVersions(nextVersions);
        setVersionsLoading(false);
      },
      (err) => {
        setDataError(err.message);
        setVersionsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authReady, user, selectedAgentId]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-500">Loading workspace...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const handleOpenNewAgent = () => {
    setEditingAgent(null);
    setAgentModalOpen(true);
  };

  const handleOpenEditAgent = (agent: AgentRecord) => {
    setEditingAgent(agent);
    setAgentModalOpen(true);
  };

  const handleAgentSubmit = async (
    values: AgentFormValues,
    initialVersion?: VersionFormValues
  ) => {
    if (editingAgent) {
      await updateAgent(editingAgent.id, values);
    } else {
      const createdId = await createAgent(user.uid, values, initialVersion);
      setSelectedAgentId(createdId);
    }
  };

  const handleDeleteAgent = async (agent: AgentRecord) => {
    await deleteAgent(agent.id, user.uid);
    if (selectedAgentId === agent.id) {
      setSelectedAgentId(null);
    }
  };

  const handleOpenNewVersion = () => {
    setEditingVersion(null);
    setVersionModalOpen(true);
  };

  const handleOpenEditVersion = (version: AgentVersionRecord) => {
    setEditingVersion(version);
    setVersionModalOpen(true);
  };

  const handleVersionSubmit = async (values: VersionFormValues) => {
    if (!selectedAgent) return;
    if (editingVersion) {
      await updateAgentVersion(selectedAgent.id, editingVersion.id, versions, values);
    } else {
      await createAgentVersion(user.uid, selectedAgent, versions, values);
    }
  };

  const handleDeleteVersion = async (version: AgentVersionRecord) => {
    if (!selectedAgent) return;
    await deleteAgentVersion(selectedAgent.id, version.id, versions);
  };

  const userInitials = (user.displayName || user.email || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar Navigation (260px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-150 lg:static lg:translate-x-0 shrink-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Sidebar Brand Header */}
          <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedAgentId(null);
                setMobileSidebarOpen(false);
              }}
              className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
            >
              AgentLedger
            </button>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close navigation"
              className="p-1 text-slate-400 hover:text-slate-700 lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Sidebar Links */}
          <nav className="p-3 space-y-1 border-b border-slate-200" aria-label="Workspace">
            <button
              type="button"
              onClick={() => {
                setSelectedAgentId(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedAgentId === null
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 shrink-0" />
                <span>All Agents</span>
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {agents.length}
              </span>
            </button>
          </nav>

          {/* Agents Quick-Jump List */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Agents
              </span>
              <button
                type="button"
                onClick={handleOpenNewAgent}
                aria-label="Create agent"
                className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {agents.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">
                No agents added yet.
              </p>
            ) : (
              <div className="space-y-0.5 mt-1">
                {agents.map((agent) => {
                  const isActive = agent.id === selectedAgentId;
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => {
                        setSelectedAgentId(agent.id);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <GitBranch className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{agent.name}</span>
                      </span>
                      <span className="font-mono tabular-nums text-[11px] opacity-75 shrink-0">
                        {agent.latestVersionTag}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Account Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2.5 px-2 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User avatar'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center shrink-0">
                  {userInitials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user.displayName || 'User'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={signOutUser}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary CTA on right */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-8 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation"
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <button
                type="button"
                onClick={() => setSelectedAgentId(null)}
                className={`whitespace-nowrap shrink-0 transition-colors ${
                  selectedAgent
                    ? 'text-slate-500 hover:text-slate-900'
                    : 'font-semibold text-slate-900'
                }`}
              >
                Agents
              </button>
              {selectedAgent && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-900 truncate">
                    {selectedAgent.name}
                  </span>
                </>
              )}
            </nav>
          </div>

          <div className="shrink-0">
            {selectedAgent ? (
              <button
                type="button"
                onClick={handleOpenNewVersion}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                New Version
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenNewAgent}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                New Agent
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {dataError && (
            <div
              role="alert"
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between gap-4"
            >
              <span className="break-words">{dataError}</span>
              <button
                type="button"
                onClick={() => setDataError(null)}
                className="font-medium text-red-700 hover:text-red-900 shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {selectedAgent ? (
            <AgentDetailView
              agent={selectedAgent}
              versions={versions}
              versionsLoading={versionsLoading}
              onBack={() => setSelectedAgentId(null)}
              onEditAgent={handleOpenEditAgent}
              onDeleteAgent={handleDeleteAgent}
              onCreateVersion={handleOpenNewVersion}
              onEditVersion={handleOpenEditVersion}
              onDeleteVersion={handleDeleteVersion}
            />
          ) : (
            <AgentListView
              agents={agents}
              loading={agentsLoading}
              onSelectAgent={(id) => setSelectedAgentId(id)}
              onCreateAgent={handleOpenNewAgent}
              onEditAgent={handleOpenEditAgent}
              onDeleteAgent={handleDeleteAgent}
              onSeedStarterAgents={() => seedStarterAgents(user.uid)}
            />
          )}
        </main>
      </div>

      {/* Create / Edit Agent Modal */}
      <AgentFormModal
        open={agentModalOpen}
        editingAgent={editingAgent}
        onClose={() => setAgentModalOpen(false)}
        onSubmit={handleAgentSubmit}
      />

      {/* Create / Edit Version Modal */}
      {selectedAgent && (
        <VersionFormModal
          open={versionModalOpen}
          agentName={selectedAgent.name}
          existingVersions={versions}
          editingVersion={editingVersion}
          onClose={() => setVersionModalOpen(false)}
          onSubmit={handleVersionSubmit}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WorkspaceApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
