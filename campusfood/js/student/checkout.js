import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import { loadStudentOrderHistory } from './history.js';
import { getCart, setCart, updateCartDisplay } from './cart.js';

export async function placeOrder() {
  const cart = getCart();

  if (cart.length === 0) {
    toast('Your cart is empty', 'error');
    return;
  }

  const username = sessionStorage.getItem('username');

  if (!username) {
    toast('Please login again', 'error');
    return;
  }

  const { data: { user }, error: userError } = await sb.auth.getUser();
  if (userError || !user) {
    toast('Please login again', 'error');
    return;
  }

  let studentId = sessionStorage.getItem('studentId');

  if (!studentId) {
    const { data: existingStudent } = await sb
      .from('students')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingStudent) {
      studentId = existingStudent.id;
      sessionStorage.setItem('studentId', studentId);
    } else {
      const { data: newStudent, error: createError } = await sb
        .from('students')
        .insert([{
          id: user.id,
          username,
          email: user.email
        }])
        .select()
        .maybeSingle();

      if (createError) {
        console.error('Create student error:', createError);
        toast('Failed to create student profile: ' + createError.message, 'error');
        return;
      }

      studentId = newStudent.id;
      sessionStorage.setItem('studentId', studentId);
    }
  }

  if (!studentId) {
    toast('Student not found. Please login again.', 'error');
    return;
  }

  const vendorIds = [...new Set(cart.map(item => item.vendor_id))];

  if (vendorIds.length > 1) {
    toast('Please order from one vendor at a time', 'error');
    return;
  }

  const vendorId = vendorIds[0];

  const { data: vendorCheck, error: vendorError } = await sb
    .from('vendors')
    .select('id, username, status')
    .eq('id', vendorId)
    .maybeSingle();

  if (vendorError) {
    console.error('Vendor query error:', vendorError);
    toast('Error checking vendor', 'error');
    return;
  }

  if (!vendorCheck) {
    toast('Vendor not found. Please try again.', 'error');
    return;
  }

  if (vendorCheck.status !== 'approved') {
    toast('This vendor is not available at the moment', 'error');
    return;
  }

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const orderData = {
    order_number: orderNumber,
    student_id: studentId,
    student_username: username,
    student_email: user.email,
    vendor_id: vendorId,
    items: cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price
    })),
    total_price: totalPrice,
    status: 'Order Placed',
    created_at: new Date().toISOString()
  };

  const { error: insertError } = await sb
    .from('orders')
    .insert([orderData]);

  if (insertError) {
    console.error('Order insertion error:', insertError);
    toast('Failed to place order: ' + insertError.message, 'error');
    return;
  }

  toast('Order placed successfully!');

  setCart([]);
  sessionStorage.removeItem('cart');
  updateCartDisplay();

  if (typeof loadStudentOrderHistory === 'function') {
    await loadStudentOrderHistory();
  }
}
