import express from 'express';
import userRoutes from './user.js';
import orderRoutes from './order.js';

const router = express.Router();

router.use('/user', userRoutes);
router.use('/order', orderRoutes);

export default router;
