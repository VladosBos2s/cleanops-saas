import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import catalogRoutes from './routes/catalog';
import customerRoutes from './routes/customers';
import staffRoutes from './routes/staff';
import bookingRoutes from './routes/bookings';
import publicRoutes from './routes/public';

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

// Public storefront & self-service booking routes
app.use('/public', publicRoutes);

// Multi-Tenant authenticated API routes
app.use('/auth', authRoutes);
app.use('/catalog', catalogRoutes);
app.use('/customers', customerRoutes);
app.use('/staff', staffRoutes);
app.use('/bookings', bookingRoutes);

app.listen(PORT, () => {
  console.log(`🚀 CleanOps API running on http://localhost:${PORT}`);
});