import { useState, useEffect, useCallback } from 'react';
import { fetchContexts, fetchResource, fetchSettings, fetchNamespaces, fetchForwards, stopForward } from '../api';
import ClusterPanel from './ClusterPanel';
import SettingsPage from './SettingsPage';
import { Server, Settings, RefreshCw, Plug, Moon, Sun } from 'lucide-react';
import { cn } from '../utils';

function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

export default function App() {
  const [page, setPage] = useState('clusters');
  const [darkMode, setDarkMode] = useLocalStorage('kubectl_dark_mode', true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);
  const [settings, setSettings] = useState(null);
  const [contexts, setContexts] = useState([]);
  const [selected, setSelected] = useLocalStorage('kubectl_selected_ctx', null);
  const [namespaces, setNamespaces] = useState([]);
  const [namespacesError, setNamespacesError] = useState(null);
  const [namespacesLoading, setNamespacesLoading] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useLocalStorage('kubectl_selected_ns', null);
  const [forwards, setForwards] = useState([]);
  const [resourceData, setResourceData] = useState({});
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeTab, setActiveTab] = useLocalStorage('kubectl_active_tab', 'pods');

  useEffect(() => {
    fetchSettings().then(setSettings);
    loadContexts();
    loadForwards();
    const id = setInterval(loadForwards, 5000);
    return () => clearInterval(id);
  }, []);

  async function loadContexts() {
    try {
      const ctxs = await fetchContexts();
      setContexts(ctxs);
    } catch (e) {
      console.error('Failed to load contexts', e);
    }
  }

  async function loadForwards() {
    try {
      const list = await fetchForwards();
      setForwards(list);
    } catch {
      setForwards([]);
    }
  }

  async function handleStopForward(id) {
    await stopForward(id);
    loadForwards();
  }

  // When cluster is selected, fetch its namespaces
  useEffect(() => {
    if (!selected) return;
    setNamespaces([]);
    setNamespacesError(null);
    setNamespacesLoading(true);
    fetchNamespaces(selected.filePath, selected.name)
      .then(data => {
        setNamespaces(data.items ?? []);
        setNamespacesError(data.error ?? null);
      })
      .catch(e => { setNamespaces([]); setNamespacesError(e.message); })
      .finally(() => setNamespacesLoading(false));
  }, [selected]);

  // When namespaces load, validate saved namespace is still valid
  useEffect(() => {
    if (!namespaces.length) return;
    const valid = namespaces.some(ns => ns.metadata?.name === selectedNamespace);
    if (!valid) setSelectedNamespace(null);
    else setResourceData({});
  }, [namespaces]);

  const loadTab = useCallback(async (ctx, ns, tab) => {
    if (!ctx || !ns || !tab) return;
    setResourceLoading(true);
    setResourceError(null);
    try {
      const data = await fetchResource(ctx.filePath, ctx.name, ns, tab);
      setResourceData(prev => ({ ...prev, [tab]: data }));
      setLastRefresh(new Date());
    } catch (e) {
      setResourceError(e.message);
    } finally {
      setResourceLoading(false);
    }
  }, []);

  // When namespace or active tab changes, fetch that tab's data if not already loaded
  useEffect(() => {
    if (!selected || !selectedNamespace) return;
    loadTab(selected, selectedNamespace, activeTab);
  }, [selected, selectedNamespace, activeTab, loadTab]);

  function selectContext(ctx) {
    if (selected?.filePath === ctx.filePath && selected?.name === ctx.name) {
      setSelected(null);
      setNamespaces([]);
      setSelectedNamespace(null);
      setResourceData({});
    } else {
      setSelected(ctx);
      setResourceData({});
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top nav */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-violet-500 dark:text-violet-400" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Kubectl Tool</span>
          <span className="text-xs text-slate-500 dark:text-slate-500">v{import.meta.env.APP_VERSION}</span>
        </div>
        <div className="flex items-center gap-2">
          {forwards.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Plug size={12} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{forwards.length} forward{forwards.length > 1 ? 's' : ''}</span>
              <div className="flex items-center gap-1 ml-1">
                {forwards.map(fwd => (
                  <div key={fwd.id} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded px-2 py-0.5">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">{fwd.pod.split('-').slice(0, 3).join('-')} · {fwd.ports.join(', ')}</span>
                    <button
                      onClick={() => handleStopForward(fwd.id)}
                      className="ml-1 text-slate-500 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors text-sm leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lastRefresh && (
            <span className="text-xs text-slate-500 dark:text-slate-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          {selected && selectedNamespace && (
            <button
              onClick={() => loadTab(selected, selectedNamespace, activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          )}
          <button
            onClick={() => setDarkMode(d => !d)}
            className="p-1.5 rounded-md transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setPage(p => p === 'settings' ? 'clusters' : 'settings')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              page === 'settings' ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-slate-800' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
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
          <aside className="flex-shrink-0 w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Clusters</div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {contexts.length === 0 && (
                <div className="px-4 py-6 text-xs text-slate-500 dark:text-slate-500 text-center">
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
                      sel ? 'bg-violet-50 dark:bg-violet-600/20 text-violet-700 dark:text-white border-violet-500' : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent'
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
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-500">
                <Server size={40} className="mb-4 opacity-30" />
                <p className="text-sm">Select a cluster from the sidebar</p>
              </div>
            ) : (
              <>
                {/* Namespace selector bar */}
                <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-700 dark:text-slate-400 font-medium">Namespace</span>
                  {namespacesLoading ? (
                    <span className="text-xs text-slate-500 dark:text-slate-500 animate-pulse">Loading namespaces…</span>
                  ) : namespaces.length === 0 ? (
                    <span className="text-xs text-red-600 dark:text-red-400" title={namespacesError ?? undefined}>
                      {namespacesError ? `Error: ${namespacesError}` : 'No namespaces found'}
                    </span>
                  ) : (
                    <select
                      value={selectedNamespace ?? ''}
                      onChange={e => { setSelectedNamespace(e.target.value || null); setResourceData({}); }}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500 cursor-pointer"
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
                    <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-500">
                      <p className="text-sm">Select a namespace above</p>
                    </div>
                  ) : (
                    <ClusterPanel
                      data={resourceData}
                      loading={resourceLoading && !resourceData[activeTab]}
                      error={resourceError}
                      ctx={selected}
                      activeTab={activeTab}
                      onTabChange={tab => {
                        setActiveTab(tab);
                        setResourceData(prev => ({ ...prev }));
                      }}
                      onForwardsChange={loadForwards}
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
