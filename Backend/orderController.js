import { supabase } from './supabaseClient.js';


// ==============================
// 1. CREATE ORDER (Student)
// ==============================
export const createOrder = async (req, res) => {
  try {
    const {
      student_id,
      vendor_id,
      total_price,
      items
    } = req.body;

    // Validate input
    if (!student_id || !vendor_id || !items || items.length === 0) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    // 1. Insert into orders table
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          student_id,
          vendor_id,
          status: 'Order Received',
          total_price
        }
      ])
      .select()
      .single();

    if (orderError) {
      return res.status(400).json({ error: orderError.message });
    }

    // 2. Insert into order_items table
    const orderItems = items.map(item => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      return res.status(400).json({ error: itemsError.message });
    }

    return res.status(201).json({
      message: "Order created successfully",
      order_id: order.id
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};


// ==============================
// 2. GET VENDOR ORDERS
// ==============================
export const getVendorOrders = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        student_id,
        vendor_id,
        status,
        total_price,
        order_items (
          id,
          menu_item_id,
          quantity,
          price
        )
      `)
      .eq('vendor_id', vendorId)
      .order('id', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json(data);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};


// ==============================
// 3. UPDATE ORDER STATUS
// ==============================
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      'Order Received',
      'Preparing',
      'Ready for Pickup',
      'Completed',
      'Cancelled'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status value"
      });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      message: "Order status updated successfully",
      order: data
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};