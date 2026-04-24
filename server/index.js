import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import settingsRouter from './routes/settings.js';
import k8sRouter, { handleExecSocket } from './routes/k8s.js';

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

const server = createServer(app);

const wss = new WebSocketServer({ server, path: '/ws/exec' });
wss.on('connection', (ws, req) => handleExecSocket(ws, req));

server.listen(PORT, () => {
  console.log(`kubectl-tool server running on port ${PORT}`);
});
