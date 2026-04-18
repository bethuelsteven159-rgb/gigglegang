import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mslvqduxmkuusuyaewej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbHZxZHV4bWt1dXN1eWFld2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODkzNDcsImV4cCI6MjA5MTU2NTM0N30.VxvR39nI5lNK_JZ6fwctQJgAH06YhbCTd8bXuiLpJgs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// CREATE MENU ITEM
export async function createMenuItem(item, user) {
  let imagePath = item.image_url || null;

  const { data, error } = await supabase
    .from('menu_items')
    .insert([{
      vendor_id: user.id,
      name: item.name,
      description: item.description || null,
      price: item.price,
      image_url: imagePath,
      is_available: true
    }])
    .select()
    .single();

  return { data, error };
}

// UPDATE MENU ITEM
export async function updateMenuItem(id, updates) {
  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

// DELETE MENU ITEM
export async function deleteMenuItem(id) {
  const { data, error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id);

  return { data, error };
}

// TOGGLE AVAILABILITY (SOLD OUT / AVAILABLE)
export async function toggleAvailability(id, status) {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ is_available: status })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

// FETCH VENDOR MENU
export async function getVendorMenu(user) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('vendor_id', user.id);

  return { data, error };
}

// ADMIN: APPROVE OR SUSPEND VENDOR
export async function setVendorStatus(vendorId, status) {
  const { data, error } = await supabase
    .from('vendors')
    .update({ account_status: status })
    .eq('id', vendorId)
    .select()
    .single();

  return { data, error };
} 
