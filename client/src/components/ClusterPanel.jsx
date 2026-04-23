import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search, X, RefreshCw } from 'lucide-react';
import { statusColor, getPodStatus, getAge, cn } from '../utils';
import { fetchPodEnv } from '../api';

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
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500">
              <th className="text-left pr-4 pb-1 font-normal">Name</th>
              <th className="text-left pb-1 font-normal">Value</th>
            </tr>
          </thead>
          <tbody>
            {env.map((e, i) => (
              <tr key={i} className="border-t border-slate-700/50">
                <td className="pr-4 py-0.5 text-slate-300 font-mono align-top">{e.name}</td>
                <td className="py-0.5 text-slate-400 font-mono whitespace-pre-wrap break-all">{e.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PodExpandedContent({ pod, ctx }) {
  const [tab, setTab] = useState('spec');
  return (
    <div>
      <div className="flex gap-2 mb-3">
        {['spec', 'live'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              tab === t ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
            )}
          >
            {t === 'spec' ? 'Spec env' : 'Live env'}
          </button>
        ))}
      </div>
      {tab === 'spec'
        ? <EnvList containers={pod.spec?.containers} />
        : <PodLiveEnv ctx={ctx} namespace={pod.metadata?.namespace} podName={pod.metadata?.name} />
      }
    </div>
  );
}

function ResourceTable({ resourceKey, data, ctx, search, setSearch }) {
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
          <ResourceRows resourceKey={resourceKey} items={filtered} ctx={ctx} />
        </table>
      </div>
    </div>
  );
}

function ResourceRows({ resourceKey, items, ctx }) {
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
                  <PodExpandedContent pod={pod} ctx={ctx} />
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

export default function ClusterPanel({ data, loading, error, ctx }) {
  const [activeTab, setActiveTab] = useState('pods');
  const [search, setSearch] = useState('');

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
          <ResourceTable resourceKey={activeTab} data={data} ctx={ctx} search={search} setSearch={setSearch} />
        )}
      </div>
    </div>
  );
}
