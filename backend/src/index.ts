import express from 'express';
import { pool } from './config/db';
import { authRouter } from './routes/auth.routes';
import { habitsRouter } from './routes/habits.routes';
import { goalsRouter } from './routes/goals.routes';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api/auth', authRouter(pool));
app.use('/api/habits', habitsRouter(pool));
app.use('/api/goals', goalsRouter(pool));

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const shutdown = async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
