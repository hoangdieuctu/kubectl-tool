import { clsx } from 'clsx';

export function cn(...classes) {
  return clsx(...classes);
}

export function statusColor(status) {
  const s = (status || '').toLowerCase();
  if (['running', 'active', 'ready', 'bound', 'available', 'succeeded'].includes(s))
    return 'text-emerald-400';
  if (['pending', 'unknown', 'terminating'].includes(s))
    return 'text-yellow-400';
  if (['failed', 'crashloopbackoff', 'error', 'imagepullbackoff', 'oomkilled'].includes(s))
    return 'text-red-400';
  return 'text-slate-400';
}

export function getPodStatus(pod) {
  if (pod.metadata?.deletionTimestamp) return 'Terminating';
  const phase = pod.status?.phase;
  if (phase === 'Running') {
    const waiting = pod.status?.containerStatuses?.find(c => c.state?.waiting);
    if (waiting) return waiting.state.waiting.reason || 'Waiting';
  }
  return phase || 'Unknown';
}

export function getAge(timestamp) {
  if (!timestamp) return '-';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
