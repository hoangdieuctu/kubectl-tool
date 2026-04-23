const API = '';

export async function fetchSettings() {
  const res = await fetch(`${API}/api/settings`);
  return res.json();
}

export async function saveSettings(data) {
  const res = await fetch(`${API}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchContexts() {
  const res = await fetch(`${API}/api/k8s/contexts`);
  return res.json();
}

export async function fetchNamespaces(filePath, context) {
  const params = new URLSearchParams({ filePath });
  if (context) params.set('context', context);
  const res = await fetch(`${API}/api/k8s/namespaces?${params}`);
  return res.json();
}

export async function fetchResources(filePath, context, namespace) {
  const params = new URLSearchParams({ filePath, namespace });
  if (context) params.set('context', context);
  const res = await fetch(`${API}/api/k8s/resources?${params}`);
  return res.json();
}

export async function fetchPodEnv(filePath, context, namespace, pod) {
  const params = new URLSearchParams({ filePath, namespace, pod });
  if (context) params.set('context', context);
  const res = await fetch(`${API}/api/k8s/pod-env?${params}`);
  return res.json();
}

export async function fetchPodLogs(filePath, context, namespace, pod, container) {
  const params = new URLSearchParams({ filePath, namespace, pod });
  if (context) params.set('context', context);
  if (container) params.set('container', container);
  const res = await fetch(`${API}/api/k8s/pod-logs?${params}`);
  return res.json();
}
