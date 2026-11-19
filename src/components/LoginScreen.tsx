import { ArrowRight, GitBranch, Layers, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen() {
  const { signInWithGoogle, signingIn, authError, clearAuthError } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="h-16 bg-white border-b border-slate-200 px-6 lg:px-10 flex items-center justify-between gap-8">
        <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          AgentLedger
        </span>
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
          Agent Registry &amp; Version Control
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="lg:col-span-7 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 mb-3">
                Workspace Authentication
              </p>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 text-balance mb-4">
                Track every AI agent, framework, and versioned release in one ledger.
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed mb-8">
                Maintain a structured inventory of your production agents across n8n, LangGraph, CrewAI, Google ADK, OpenAI Agents SDK, and custom Python pipelines with full prompt and tool changelogs.
              </p>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div className="flex items-start gap-3">
                <Layers className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Unified Agent Registry</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Catalog agent names, core objectives, and orchestration frameworks with fast filtering.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GitBranch className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Structured Version History</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Record v1, v2, v3 releases with dates, changelogs, prompt deltas, and tool inventory changes.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Private Cloud Persistence</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your agents and version snapshots are isolated to your authenticated workspace.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 p-8 lg:p-10 bg-slate-50/70 flex flex-col justify-center">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Sign in to continue
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Use your Google account to access your private agent registry and version logs.
            </p>

            {authError && (
              <div
                role="alert"
                className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start justify-between gap-2"
              >
                <span>{authError}</span>
                <button
                  type="button"
                  onClick={clearAuthError}
                  className="text-red-700 hover:text-red-900 font-medium shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={signingIn}
              className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap"
            >
              <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>

            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Authentication and database storage are powered by Firebase Auth and Cloud Firestore.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-6 lg:px-10 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 flex items-center justify-between">
        <span>AgentLedger</span>
        <span>Agent &amp; Version Tracking Workspace</span>
      </footer>
    </div>
  );
}
