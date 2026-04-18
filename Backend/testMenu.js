import { createMenuItem, updateMenuItem, toggleAvailability, getVendorMenu } from './menuController.js';

async function testMenu() {
  // Test vendor (replace with your actual UUID if you have one)
  const vendor = { id: '00000000-0000-0000-0000-000000000000' }; 

  // Create a menu item
  const newItem = {
    name: 'Test Burger',
    price: 50,
    description: 'A yummy burger for testing',
    image_url: null
  };

  const { data: createData, error: createError } = await createMenuItem(newItem, vendor);
  console.log('Create Item:', createData, createError);

  if (!createData) return; // stop if creation failed

  const itemId = createData.id;

  // Update the menu item
  const { data: updateData, error: updateError } = await updateMenuItem(itemId, { price: 60 });
  console.log('Update Item:', updateData, updateError);

  // Toggle availability (mark as sold out)
  const { data: toggleData, error: toggleError } = await toggleAvailability(itemId, false);
  console.log('Toggle Availability (Sold Out):', toggleData, toggleError);

  // Toggle back to available
  const { data: toggleBackData, error: toggleBackError } = await toggleAvailability(itemId, true);
  console.log('Toggle Availability (Available):', toggleBackData, toggleBackError);

  // Fetch vendor menu
  const { data: menuData, error: menuError } = await getVendorMenu(vendor);
  console.log('Vendor Menu:', menuData, menuError);
}

// Run the test
testMenu();
