import { cancelPendingPayment } from '../student/checkout.js';

export function initPaymentCancelledPage() {
  cancelPendingPayment();
}