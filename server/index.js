import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import settingsRouter from './routes/settings.js';
import k8sRouter from './routes/k8s.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(express.json());

app.use('/api/settings', settingsRouter);
app.use('/api/k8s', k8sRouter);

// Serve built React app in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`kubectl-tool server running on port ${PORT}`);
});
