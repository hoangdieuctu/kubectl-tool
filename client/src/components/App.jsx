import { useState, useEffect, useCallback } from 'react';
import { fetchContexts, fetchResources, fetchSettings, fetchNamespaces } from '../api';
import ClusterPanel from './ClusterPanel';
import SettingsPage from './SettingsPage';
import { Server, Settings, RefreshCw } from 'lucide-react';
import { cn } from '../utils';

export default function App() {
  const [page, setPage] = useState('clusters');
  const [settings, setSettings] = useState(null);
  const [contexts, setContexts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [namespaces, setNamespaces] = useState([]);
  const [namespacesLoading, setNamespacesLoading] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState(null);
  const [resourceData, setResourceData] = useState(null);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    fetchSettings().then(setSettings);
    loadContexts();
  }, []);

  async function loadContexts() {
    try {
      const ctxs = await fetchContexts();
      setContexts(ctxs);
    } catch (e) {
      console.error('Failed to load contexts', e);
    }
  }

  // When cluster is selected, fetch its namespaces
  useEffect(() => {
    if (!selected) return;
    setNamespaces([]);
    setSelectedNamespace(null);
    setResourceData(null);
    setNamespacesLoading(true);
    fetchNamespaces(selected.filePath, selected.name)
      .then(data => setNamespaces(data.items ?? []))
      .catch(() => setNamespaces([]))
      .finally(() => setNamespacesLoading(false));
  }, [selected]);

  const loadResources = useCallback(async (ctx, ns) => {
    if (!ctx || !ns) return;
    setResourceLoading(true);
    setResourceError(null);
    try {
      const data = await fetchResources(ctx.filePath, ctx.name, ns);
      setResourceData(data);
      setLastRefresh(new Date());
    } catch (e) {
      setResourceError(e.message);
    } finally {
      setResourceLoading(false);
    }
  }, []);

  // When namespace is selected, fetch resources
  useEffect(() => {
    if (!selected || !selectedNamespace) return;
    loadResources(selected, selectedNamespace);
  }, [selected, selectedNamespace, loadResources]);

  function selectContext(ctx) {
    if (selected?.filePath === ctx.filePath && selected?.name === ctx.name) {
      setSelected(null);
      setNamespaces([]);
      setSelectedNamespace(null);
      setResourceData(null);
    } else {
      setSelected(ctx);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* Top nav */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 h-12 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-violet-400" />
          <span className="text-sm font-semibold text-white">kubectl-tool</span>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-slate-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          {selected && selectedNamespace && (
            <button
              onClick={() => loadResources(selected, selectedNamespace)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          )}
          <button
            onClick={() => setPage(p => p === 'settings' ? 'clusters' : 'settings')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              page === 'settings' ? 'text-violet-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {page === 'settings' ? (
        <SettingsPage
          settings={settings}
          onSaved={s => { setSettings(s); setPage('clusters'); loadContexts(); }}
        />
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Sidebar: cluster list */}
          <aside className="flex-shrink-0 w-56 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Clusters</div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {contexts.length === 0 && (
                <div className="px-4 py-6 text-xs text-slate-500 text-center">
                  No configs found.<br />Check Settings.
                </div>
              )}
              {contexts.map((ctx, i) => {
                const sel = selected?.filePath === ctx.filePath && selected?.name === ctx.name;
                return (
                  <button
                    key={i}
                    onClick={() => selectContext(ctx)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 transition-colors border-l-2',
                      sel ? 'bg-violet-600/20 text-white border-violet-500' : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                    )}
                  >
                    <div className="text-xs font-medium truncate">{ctx.file}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main area */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <Server size={40} className="mb-4 opacity-30" />
                <p className="text-sm">Select a cluster from the sidebar</p>
              </div>
            ) : (
              <>
                {/* Namespace selector bar */}
                <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 bg-slate-900 border-b border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Namespace</span>
                  {namespacesLoading ? (
                    <span className="text-xs text-slate-500 animate-pulse">Loading namespaces…</span>
                  ) : namespaces.length === 0 ? (
                    <span className="text-xs text-red-400">No namespaces found</span>
                  ) : (
                    <select
                      value={selectedNamespace ?? ''}
                      onChange={e => setSelectedNamespace(e.target.value || null)}
                      className="bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500 cursor-pointer"
                    >
                      <option value="">Select namespace…</option>
                      {namespaces.map(ns => {
                        const name = ns.metadata?.name;
                        return <option key={name} value={name}>{name}</option>;
                      })}
                    </select>
                  )}
                </div>

                {/* Resource panel */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  {!selectedNamespace ? (
                    <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-500">
                      <p className="text-sm">Select a namespace above</p>
                    </div>
                  ) : (
                    <ClusterPanel
                      data={resourceData}
                      loading={resourceLoading}
                      error={resourceError}
                      ctx={selected}
                    />
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
