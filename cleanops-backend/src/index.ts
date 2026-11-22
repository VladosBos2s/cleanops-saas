import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'CleanOps API' });
});

// Auth & Multi-Tenant routes
app.use('/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`🚀 CleanOps API running on http://localhost:${PORT}`);
});