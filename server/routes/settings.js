import { Router } from 'express';
import { loadSettings, saveSettings } from '../k8s/settings.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(loadSettings());
});

router.post('/', (req, res) => {
  const { kubeconfigDir } = req.body;
  if (!kubeconfigDir || typeof kubeconfigDir !== 'string') {
    return res.status(400).json({ error: 'kubeconfigDir is required' });
  }
  const updated = saveSettings({ kubeconfigDir });
  res.json(updated);
});

export default router;
