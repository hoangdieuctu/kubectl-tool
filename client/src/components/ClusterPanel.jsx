import { useState, useMemo, useEffect, Component } from 'react';
import { ChevronDown, ChevronRight, Search, X, RefreshCw } from 'lucide-react';
import { statusColor, getPodStatus, getAge, cn } from '../utils';
import { fetchPodEnv, fetchPodLogs, startForward, stopForward, fetchForwards } from '../api';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div className="text-xs text-red-400 p-2">Error: {this.state.error.message}</div>
    );
    return this.props.children;
  }
}

const RESOURCE_TABS = [
  { key: 'pods', label: 'Pods' },
  { key: 'deployments', label: 'Deployments' },
  { key: 'services', label: 'Services' },
  { key: 'nodes', label: 'Nodes' },
  { key: 'replicaSets', label: 'ReplicaSets' },
  { key: 'statefulSets', label: 'StatefulSets' },
  { key: 'daemonSets', label: 'DaemonSets' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'cronJobs', label: 'CronJobs' },
  { key: 'configMaps', label: 'ConfigMaps' },
  { key: 'secrets', label: 'Secrets' },
  { key: 'ingresses', label: 'Ingresses' },
  { key: 'pvcs', label: 'PVCs' },
  { key: 'pvs', label: 'PVs' },
  { key: 'serviceAccounts', label: 'ServiceAccounts' },
  { key: 'roles', label: 'Roles' },
  { key: 'roleBindings', label: 'RoleBindings' },
  { key: 'clusterRoles', label: 'ClusterRoles' },
  { key: 'clusterRoleBindings', label: 'ClusterRoleBindings' },
  { key: 'storageClasses', label: 'StorageClasses' },
  { key: 'endpoints', label: 'Endpoints' },
];

function EnvList({ containers }) {
  if (!containers?.length) return <span className="text-slate-500 text-xs">No containers</span>;
  return (
    <div className="space-y-3">
      {containers.map((c, i) => (
        <div key={i}>
          <div className="text-xs font-medium text-violet-400 mb-1">{c.name}</div>
          {c.env?.length ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left pr-4 pb-1 font-normal">Name</th>
                  <th className="text-left pb-1 font-normal">Value</th>
                </tr>
              </thead>
              <tbody>
                {c.env.map((e, j) => (
                  <tr key={j} className="border-t border-slate-700/50">
                    <td className="pr-4 py-0.5 text-slate-300 font-mono">{e.name}</td>
                    <td className="py-0.5 text-slate-400 font-mono break-all">
                      {e.value ?? (e.valueFrom ? <span className="text-yellow-500 italic">from ref</span> : '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <span className="text-slate-500 text-xs">No env vars</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ExpandableRow({ cols, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="border-t border-slate-800 hover:bg-slate-800/50 cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <td className="pl-3 py-2 w-6">
          {open ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
        </td>
        {cols.map((c, i) => (
          <td key={i} className="px-3 py-2 text-sm whitespace-nowrap">{c}</td>
        ))}
      </tr>
      {open && (
        <tr className="border-t border-slate-800 bg-slate-900">
          <td colSpan={cols.length + 1} className="px-6 py-4">
            {children}
          </td>
        </tr>
      )}
    </>
  );
}

function PodLiveEnv({ ctx, namespace, podName }) {
  const [env, setEnv] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPodEnv(ctx.filePath, ctx.name, namespace, podName);
      if (data.error) throw new Error(data.error);
      setEnv(data.env);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!env && !loading && !error) {
    return (
      <button
        onClick={load}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-white rounded-md transition-colors"
      >
        <RefreshCw size={12} /> Fetch live env
      </button>
    );
  }

  const filtered = env
    ? (search ? env.filter(e => e.name.toLowerCase().includes(search.toLowerCase())) : env)
    : [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-violet-400 font-medium">Live env</span>
        <button onClick={load} className="text-slate-500 hover:text-white transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}
      {env && (
        <>
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by name…"
              className="w-full bg-slate-800 border border-slate-700 rounded pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 mb-1">{filtered.length} / {env.length} vars</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left pr-4 pb-1 font-normal">Name</th>
                <th className="text-left pb-1 font-normal">Value</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={i} className="border-t border-slate-700/50">
                  <td className="pr-4 py-0.5 text-slate-300 font-mono align-top">{e.name}</td>
                  <td className="py-0.5 text-slate-400 font-mono whitespace-pre-wrap break-all">{e.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function PodLogs({ ctx, namespace, podName, containers }) {
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [container, setContainer] = useState(containers?.[0]?.name ?? '');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPodLogs(ctx.filePath, ctx.name, namespace, podName, container);
      if (data.error) throw new Error(data.error);
      setLogs(data.logs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredLines = useMemo(() => {
    if (!logs) return [];
    const lines = logs.split('\n');
    if (!search) return lines;
    const q = search.toLowerCase();
    return lines.filter(line => line.toLowerCase().includes(q));
  }, [logs, search]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {containers?.length > 1 && (
          <select
            value={container}
            onChange={e => { setContainer(e.target.value); setLogs(null); }}
            className="bg-slate-800 border border-slate-700 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-violet-500"
          >
            {containers.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-xs text-white rounded-md transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {logs ? 'Refresh' : 'Fetch logs'}
        </button>
        {logs && <span className="text-xs text-slate-500">last 200 lines</span>}
      </div>
      {error && <div className="text-xs text-red-400 mb-2">{error}</div>}
      {logs && (
        <>
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter logs…"
              className="w-full bg-slate-800 border border-slate-700 rounded pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>
          {search && <div className="text-xs text-slate-500 mb-1">{filteredLines.length} matching lines</div>}
          <pre className="text-xs text-slate-300 font-mono bg-slate-900 border border-slate-700 rounded-lg p-3 overflow-auto max-h-96 whitespace-pre-wrap break-all">
            {filteredLines.join('\n')}
          </pre>
        </>
      )}
    </div>
  );
}

function PodPortForward({ pod, ctx, onForwardsChange }) {
  const [portsInput, setPortsInput] = useState('');
  const [activeForward, setActiveForward] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const namespace = pod.metadata?.namespace;
  const podName = pod.metadata?.name;

  // Check if this pod already has an active forward
  useEffect(() => {
    fetchForwards().then(list => {
      const fwd = list.find(f => f.pod === podName && f.namespace === namespace);
      setActiveForward(fwd ?? null);
    });
  }, [podName, namespace]);

  async function handleStart() {
    const ports = portsInput.split(',').map(p => p.trim()).filter(Boolean);
    if (!ports.length) return setError('Enter at least one port (e.g. 8080:8080)');
    setLoading(true);
    setError(null);
    try {
      const fwd = await startForward({ filePath: ctx.filePath, context: ctx.name, namespace, pod: podName, ports });
      if (fwd.error) throw new Error(fwd.error);
      setActiveForward(fwd);
      onForwardsChange?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    if (!activeForward) return;
    setLoading(true);
    try {
      await stopForward(activeForward.id);
      setActiveForward(null);
      onForwardsChange?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {activeForward ? (
        <div className="flex items-center gap-3 p-3 bg-emerald-900/20 border border-emerald-700 rounded-lg">
          <div className="flex-1">
            <div className="text-xs font-medium text-emerald-400">Active forward</div>
            <div className="text-xs text-slate-300 font-mono mt-0.5">{activeForward.ports.join(', ')}</div>
          </div>
          <button
            onClick={handleStop}
            disabled={loading}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs rounded-md transition-colors"
          >
            Stop
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={portsInput}
            onChange={e => setPortsInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            placeholder="8080:8080, 9090:9090"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
          />
          <button
            onClick={handleStart}
            disabled={loading || !portsInput.trim()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {loading ? 'Starting…' : 'Start'}
          </button>
        </div>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
      <p className="text-xs text-slate-500">Format: <span className="font-mono">localPort:remotePort</span> — comma-separate multiple ports</p>
    </div>
  );
}

function PodExpandedContent({ pod, ctx, onForwardsChange }) {
  const [tab, setTab] = useState('spec');
  const tabs = [
    { key: 'spec', label: 'Spec env' },
    { key: 'live', label: 'Live env' },
    { key: 'logs', label: 'Logs' },
    { key: 'forward', label: 'Port Forward' },
  ];
  return (
    <div>
      <div className="flex gap-2 mb-3">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              tab === t.key ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'spec' && <EnvList containers={pod.spec?.containers} />}
      {tab === 'live' && <PodLiveEnv ctx={ctx} namespace={pod.metadata?.namespace} podName={pod.metadata?.name} />}
      {tab === 'logs' && <PodLogs ctx={ctx} namespace={pod.metadata?.namespace} podName={pod.metadata?.name} containers={pod.spec?.containers} />}
      {tab === 'forward' && <PodPortForward pod={pod} ctx={ctx} onForwardsChange={onForwardsChange} />}
    </div>
  );
}

function ResourceTable({ resourceKey, data, ctx, search, setSearch, onForwardsChange }) {
  const items = data?.[resourceKey]?.items ?? [];
  const error = data?.[resourceKey]?.error;

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(item =>
      item.metadata?.name?.toLowerCase().includes(q)
    );
  }, [items, search]);

  if (error) return (
    <div className="p-4 text-red-400 text-sm bg-red-900/20 rounded-lg border border-red-800">
      Error: {error}
    </div>
  );

  if (!items.length) return (
    <div className="p-8 text-center text-slate-500 text-sm">No resources found</div>
  );

  return (
    <div>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by name…"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="text-xs text-slate-500 mb-2">{filtered.length} / {items.length} items</div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full">
          <ResourceRows resourceKey={resourceKey} items={filtered} ctx={ctx} onForwardsChange={onForwardsChange} />
        </table>
      </div>
    </div>
  );
}

function ResourceRows({ resourceKey, items, ctx, onForwardsChange }) {
  switch (resourceKey) {
    case 'pods':
      return (
        <>
          <thead><tr className="bg-slate-800/80 text-xs text-slate-400">
            <th className="w-6" />
            {['Namespace', 'Name', 'Status', 'Ready', 'Restarts', 'Age'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map((pod, i) => {
              const status = getPodStatus(pod);
              const containers = pod.status?.containerStatuses ?? [];
              const ready = containers.filter(c => c.ready).length;
              const restarts = containers.reduce((a, c) => a + (c.restartCount || 0), 0);
              return (
                <ExpandableRow key={i} cols={[
                  <span className="text-slate-400">{pod.metadata?.namespace}</span>,
                  <span className="text-white font-mono text-xs">{pod.metadata?.name}</span>,
                  <span className={cn('font-medium', statusColor(status))}>{status}</span>,
                  <span className="text-slate-300">{ready}/{containers.length}</span>,
                  <span className={restarts > 0 ? 'text-yellow-400' : 'text-slate-300'}>{restarts}</span>,
                  <span className="text-slate-400">{getAge(pod.metadata?.creationTimestamp)}</span>,
                ]}>
                  <ErrorBoundary>
                    <PodExpandedContent pod={pod} ctx={ctx} onForwardsChange={onForwardsChange} />
                  </ErrorBoundary>
                </ExpandableRow>
              );
            })}
          </tbody>
        </>
      );

    case 'deployments':
    case 'statefulSets':
    case 'daemonSets':
    case 'replicaSets':
      return (
        <>
          <thead><tr className="bg-slate-800/80 text-xs text-slate-400">
            <th className="w-6" />
            {['Namespace', 'Name', 'Ready', 'Up-to-date', 'Available', 'Age'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map((item, i) => {
              const s = item.status ?? {};
              return (
                <ExpandableRow key={i} cols={[
                  <span className="text-slate-400">{item.metadata?.namespace}</span>,
                  <span className="text-white font-mono text-xs">{item.metadata?.name}</span>,
                  <span className="text-slate-300">{s.readyReplicas ?? 0}/{s.replicas ?? 0}</span>,
                  <span className="text-slate-300">{s.updatedReplicas ?? '-'}</span>,
                  <span className="text-slate-300">{s.availableReplicas ?? '-'}</span>,
                  <span className="text-slate-400">{getAge(item.metadata?.creationTimestamp)}</span>,
                ]}>
                  <EnvList containers={item.spec?.template?.spec?.containers} />
                </ExpandableRow>
              );
            })}
          </tbody>
        </>
      );

    case 'services':
      return (
        <>
          <thead><tr className="bg-slate-800/80 text-xs text-slate-400">
            <th className="w-6" />
            {['Namespace', 'Name', 'Type', 'Cluster IP', 'External IP', 'Ports', 'Age'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map((svc, i) => {
              const ports = (svc.spec?.ports ?? []).map(p => `${p.port}${p.nodePort ? ':' + p.nodePort : ''}/${p.protocol}`).join(', ');
              const extIp = (svc.status?.loadBalancer?.ingress ?? []).map(x => x.ip || x.hostname).join(', ') || '<none>';
              return (
                <ExpandableRow key={i} cols={[
                  <span className="text-slate-400">{svc.metadata?.namespace}</span>,
                  <span className="text-white font-mono text-xs">{svc.metadata?.name}</span>,
                  <span className="text-blue-400">{svc.spec?.type}</span>,
                  <span className="text-slate-300 font-mono text-xs">{svc.spec?.clusterIP}</span>,
                  <span className="text-slate-400 font-mono text-xs">{extIp}</span>,
                  <span className="text-slate-300 text-xs">{ports}</span>,
                  <span className="text-slate-400">{getAge(svc.metadata?.creationTimestamp)}</span>,
                ]}>
                  <pre className="text-xs text-slate-300 font-mono overflow-auto max-h-64">
                    {JSON.stringify(svc.spec, null, 2)}
                  </pre>
                </ExpandableRow>
              );
            })}
          </tbody>
        </>
      );

    case 'nodes':
      return (
        <>
          <thead><tr className="bg-slate-800/80 text-xs text-slate-400">
            <th className="w-6" />
            {['Name', 'Status', 'Roles', 'Version', 'OS', 'Age'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map((node, i) => {
              const ready = node.status?.conditions?.find(c => c.type === 'Ready');
              const status = ready?.status === 'True' ? 'Ready' : 'NotReady';
              const roles = Object.keys(node.metadata?.labels ?? {})
                .filter(k => k.startsWith('node-role.kubernetes.io/'))
                .map(k => k.split('/')[1]).join(', ') || 'worker';
              return (
                <ExpandableRow key={i} cols={[
                  <span className="text-white font-mono text-xs">{node.metadata?.name}</span>,
                  <span className={cn('font-medium', statusColor(status))}>{status}</span>,
                  <span className="text-slate-300 text-xs">{roles}</span>,
                  <span className="text-slate-400 font-mono text-xs">{node.status?.nodeInfo?.kubeletVersion}</span>,
                  <span className="text-slate-400 text-xs">{node.status?.nodeInfo?.osImage}</span>,
                  <span className="text-slate-400">{getAge(node.metadata?.creationTimestamp)}</span>,
                ]}>
                  <pre className="text-xs text-slate-300 font-mono overflow-auto max-h-64">
                    {JSON.stringify(node.status?.capacity, null, 2)}
                  </pre>
                </ExpandableRow>
              );
            })}
          </tbody>
        </>
      );

    case 'configMaps':
      return (
        <>
          <thead><tr className="bg-slate-800/80 text-xs text-slate-400">
            <th className="w-6" />
            {['Namespace', 'Name', 'Keys', 'Age'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map((cm, i) => (
              <ExpandableRow key={i} cols={[
                <span className="text-slate-400">{cm.metadata?.namespace}</span>,
                <span className="text-white font-mono text-xs">{cm.metadata?.name}</span>,
                <span className="text-slate-300">{Object.keys(cm.data ?? {}).length}</span>,
                <span className="text-slate-400">{getAge(cm.metadata?.creationTimestamp)}</span>,
              ]}>
                <div className="space-y-2">
                  {Object.entries(cm.data ?? {}).map(([k, v]) => (
                    <div key={k}>
                      <div className="text-xs text-violet-400 font-mono mb-1">{k}</div>
                      <pre className="text-xs text-slate-300 font-mono bg-slate-800 p-2 rounded overflow-auto max-h-40">{v}</pre>
                    </div>
                  ))}
                </div>
              </ExpandableRow>
            ))}
          </tbody>
        </>
      );

    case 'secrets':
      return (
        <>
          <thead><tr className="bg-slate-800/80 text-xs text-slate-400">
            <th className="w-6" />
            {['Namespace', 'Name', 'Type', 'Keys', 'Age'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map((s, i) => (
              <ExpandableRow key={i} cols={[
                <span className="text-slate-400">{s.metadata?.namespace}</span>,
                <span className="text-white font-mono text-xs">{s.metadata?.name}</span>,
                <span className="text-slate-400 text-xs">{s.type}</span>,
                <span className="text-slate-300">{Object.keys(s.data ?? {}).length}</span>,
                <span className="text-slate-400">{getAge(s.metadata?.creationTimestamp)}</span>,
              ]}>
                <div className="text-xs text-slate-400">
                  Keys: {Object.keys(s.data ?? {}).join(', ') || 'none'}
                  <div className="mt-1 text-yellow-600 text-xs">Values are redacted</div>
                </div>
              </ExpandableRow>
            ))}
          </tbody>
        </>
      );

    default:
      return (
        <>
          <thead><tr className="bg-slate-800/80 text-xs text-slate-400">
            <th className="w-6" />
            {['Namespace', 'Name', 'Age'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map((item, i) => (
              <ExpandableRow key={i} cols={[
                <span className="text-slate-400">{item.metadata?.namespace ?? '-'}</span>,
                <span className="text-white font-mono text-xs">{item.metadata?.name}</span>,
                <span className="text-slate-400">{getAge(item.metadata?.creationTimestamp)}</span>,
              ]}>
                <pre className="text-xs text-slate-300 font-mono overflow-auto max-h-64">
                  {JSON.stringify(item, null, 2)}
                </pre>
              </ExpandableRow>
            ))}
          </tbody>
        </>
      );
  }
}

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
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

export default function ClusterPanel({ data, loading, error, ctx, onForwardsChange }) {
  const [activeTab, setActiveTab] = useLocalStorage('kubectl_active_tab', 'pods');
  const [search, setSearch] = useLocalStorage('kubectl_search', '');

  function switchTab(key) {
    setActiveTab(key);
    setSearch('');
  }

  const tabsWithCount = RESOURCE_TABS.map(t => ({
    ...t,
    count: data?.[t.key]?.items?.length ?? 0,
  }));

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 flex gap-1 px-4 py-2 overflow-x-auto border-b border-slate-800 bg-slate-900/50">
        {tabsWithCount.map(tab => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn('ml-1.5 px-1 rounded text-xs', activeTab === tab.key ? 'bg-violet-500' : 'bg-slate-700 text-slate-400')}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm animate-pulse">Fetching resources…</div>
        ) : error ? (
          <div className="p-4 text-red-400 text-sm bg-red-900/20 rounded-lg border border-red-800">{error}</div>
        ) : (
          <ResourceTable resourceKey={activeTab} data={data} ctx={ctx} search={search} setSearch={setSearch} onForwardsChange={onForwardsChange} />
        )}
      </div>
    </div>
  );
}
