import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import orderRoutes from './orderRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('Uni Eats Backend Running ');
});

// Orders route
app.use('/api/orders', orderRoutes);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});