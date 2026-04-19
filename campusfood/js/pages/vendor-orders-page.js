import { sb } from "../config/supabase.js";

let orders = [];
let reviews = [];

export async function initVendorOrdersPage() {
  await loadVendor();
}

// ===============================
async function loadVendor() {
  const { data: o } = await sb.from("orders").select("*");
  const { data: r } = await sb.from("reviews").select("*");

  orders = o || [];
  reviews = r || [];

  render();
}

// ===============================
function render() {
  const body = document.getElementById("vendorBody");
  body.innerHTML = "";

  orders.forEach(order => {

    const review = reviews.find(
      r => r.menu_id === order.menu_id && r.st_id === order.st_id
    );

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${order.id}</td>
      <td>${order.st_id}</td>
      <td>${order.items}</td>
      <td>${order.status}</td>
      <td>${review ? review.rating + "⭐" : "-"}</td>
      <td>${review ? review.review_text : "No review"}</td>
    `;

    body.appendChild(row);
  });
}
