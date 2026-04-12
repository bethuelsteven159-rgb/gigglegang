import express from 'express';
import {
  createOrder,
  getVendorOrders,
  updateOrderStatus
} from './orderController.js';

const router = express.Router();

// Student creates order
router.post('/', createOrder);

// Vendor gets orders
router.get('/vendor/:vendorId', getVendorOrders);

// Vendor updates order status
router.put('/:orderId/status', updateOrderStatus);

export default router;