import { Router } from 'express';
import { execSync } from 'child_process';
import { listContexts, getNamespaces, getResources } from '../k8s/client.js';

const router = Router();

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

export default router;
