import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import catalogRoutes from './routes/catalog';
import customerRoutes from './routes/customers';
import staffRoutes from './routes/staff';
import bookingRoutes from './routes/bookings';

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

// Multi-Tenant API routes
app.use('/auth', authRoutes);
app.use('/catalog', catalogRoutes);
app.use('/customers', customerRoutes);
app.use('/staff', staffRoutes);
app.use('/bookings', bookingRoutes);

app.listen(PORT, () => {
  console.log(`🚀 CleanOps API running on http://localhost:${PORT}`);
});