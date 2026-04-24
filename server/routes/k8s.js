import { Router } from 'express';
import { execSync, spawn } from 'child_process';
import { listContexts, getNamespaces, getResources } from '../k8s/client.js';

const router = Router();

// In-memory store: id -> { id, pod, namespace, ports, process, startedAt }
const forwards = new Map();
let nextId = 1;

router.get('/contexts', (_req, res) => {
  try {
    res.json(listContexts());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/namespaces', async (req, res) => {
  const { filePath, context } = req.query;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });
  try {
    const data = await getNamespaces(filePath, context);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/resources', async (req, res) => {
  const { filePath, context, namespace } = req.query;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });
  if (!namespace) return res.status(400).json({ error: 'namespace is required' });
  try {
    const data = await getResources(filePath, context, namespace);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/pod-env', (req, res) => {
  const { filePath, context, namespace, pod } = req.query;
  if (!filePath || !namespace || !pod) {
    return res.status(400).json({ error: 'filePath, namespace and pod are required' });
  }
  try {
    const output = execSync(
      `kubectl exec ${pod} --namespace=${namespace} --context=${context} --kubeconfig=${filePath} -- printenv -0`,
      { timeout: 15000 }
    );

    const env = output.toString('binary').split('\0')
      .filter(entry => entry.includes('='))
      .map(entry => {
        const idx = entry.indexOf('=');
        return { name: entry.slice(0, idx), value: entry.slice(idx + 1) };
      });

    res.json({ env });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/pod-logs', (req, res) => {
  const { filePath, context, namespace, pod, container } = req.query;
  if (!filePath || !namespace || !pod) {
    return res.status(400).json({ error: 'filePath, namespace and pod are required' });
  }
  try {
    const containerFlag = container ? `--container=${container}` : '';
    const output = execSync(
      `kubectl logs ${pod} --namespace=${namespace} --context=${context} --kubeconfig=${filePath} --tail=200 ${containerFlag}`,
      { timeout: 20000 }
    ).toString();
    res.json({ logs: output });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/port-forward', (_req, res) => {
  const list = [...forwards.values()].map(({ id, pod, namespace, ports, startedAt }) => ({
    id, pod, namespace, ports, startedAt,
  }));
  res.json(list);
});

router.post('/port-forward', (req, res) => {
  const { filePath, context, namespace, pod, ports } = req.body;
  if (!filePath || !namespace || !pod || !ports?.length) {
    return res.status(400).json({ error: 'filePath, namespace, pod and ports are required' });
  }

  // Kill existing forward for same pod
  for (const [id, fwd] of forwards) {
    if (fwd.pod === pod && fwd.namespace === namespace) {
      fwd.process.kill();
      forwards.delete(id);
    }
  }

  const id = nextId++;
  const proc = spawn('kubectl', [
    'port-forward', pod,
    `--namespace=${namespace}`,
    `--context=${context}`,
    `--kubeconfig=${filePath}`,
    ...ports,
  ]);

  proc.on('exit', () => forwards.delete(id));

  forwards.set(id, { id, pod, namespace, ports, process: proc, startedAt: new Date().toISOString() });
  res.json({ id, pod, namespace, ports });
});

router.delete('/port-forward/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const fwd = forwards.get(id);
  if (!fwd) return res.status(404).json({ error: 'Forward not found' });
  fwd.process.kill();
  forwards.delete(id);
  res.json({ ok: true });
});

export default router;
