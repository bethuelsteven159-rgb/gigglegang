import { sb } from "../config/supabase.js";
import { getUserId } from "../shared/auth.js";

let orders = [];
let reviews = [];
let vendorsMap = {};

let currentOrder = null;
let rating = 0;

const studentId = getUserId();

export async function initStudentHistoryPage() {
  await load();
  bindEvents();
}

async function load() {
  try {
    const { data: o, error: ordersError } = await sb
      .from("orders")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    const { data: r, error: reviewsError } = await sb
      .from("reviews")
      .select("*")
      .eq("student_id", studentId);

    if (ordersError) {
      console.error("Orders load error:", ordersError);
    }

    if (reviewsError) {
      console.error("Reviews load error:", reviewsError);
    }

    orders = o || [];
    reviews = r || [];

    // get vendor names
    const vendorIds = [...new Set(orders.map(order => order.vendor_id).filter(Boolean))];

    if (vendorIds.length > 0) {
      const { data: vendors, error: vendorsError } = await sb
        .from("vendors")
        .select("id, username")
        .in("id", vendorIds);

      if (vendorsError) {
        console.error("Vendors load error:", vendorsError);
      } else {
        vendorsMap = {};
        vendors.forEach(v => {
          vendorsMap[v.id] = v.username;
        });
      }
    }

    render();
  } catch (err) {
    console.error("Unexpected load error:", err);
  }
}

function render() {
  const body = document.getElementById("historyBody");
  if (!body) return;

  body.innerHTML = "";

  if (orders.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:1.5rem;">
          No order history found
        </td>
      </tr>
    `;
    return;
  }

  orders.forEach(order => {
    const review = reviews.find(r => r.menu_id === order.menu_id);
    const vendorName = vendorsMap[order.vendor_id] || `Vendor ${order.vendor_id}`;
    const itemsText = Array.isArray(order.items)
      ? order.items.map(i => i.name || i.title || "Item").join(", ")
      : order.items || "";
    const totalText = order.total_price != null ? `R${order.total_price}` : "R0";
    const dateText = order.created_at
      ? new Date(order.created_at).toLocaleString()
      : "";

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${order.order_number || order.id}</td>
      <td>${vendorName}</td>
      <td>${itemsText}</td>
      <td>${totalText}</td>
      <td>${order.status || ""}</td>
      <td>${dateText}</td>
      <td>
        ${
          review
            ? `<button data-id="${order.id}" class="editBtn">Edit</button>`
            : order.status === "Delivered" || order.status === "Completed"
              ? `<button data-id="${order.id}" class="reviewBtn">Review</button>`
              : "Locked"
        }
      </td>
    `;

    body.appendChild(row);
  });
}

function bindEvents() {
  document.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("reviewBtn") ||
      e.target.classList.contains("editBtn")
    ) {
      openModal(e.target.dataset.id);
    }

    if (e.target.classList.contains("star")) {
      rating = parseInt(e.target.dataset.value, 10);
      updateStars(rating);
    }

    if (e.target.classList.contains("tag")) {
      const box = document.getElementById("reviewText");
      const text = e.target.textContent;

      if (!box.value.includes(text)) {
        box.value += (box.value ? ", " : "") + text;
      }

      e.target.classList.toggle("active");
    }
  });
}

function updateStars(value) {
  document.querySelectorAll(".star").forEach((s) => {
    s.textContent = Number(s.dataset.value) <= value ? "★" : "☆";
  });
}

window.openModal = (id) => {
  currentOrder = orders.find(o => String(o.id) === String(id));
  if (!currentOrder) return;

  rating = 0;
  document.getElementById("reviewText").value = "";
  updateStars(0);

  document.getElementById("reviewModal").style.display = "flex";
};

window.closeModal = () => {
  document.getElementById("reviewModal").style.display = "none";
};

// alias because your HTML uses closeReviewModal()
window.closeReviewModal = window.closeModal;

window.submitReview = async () => {
  if (!currentOrder) return;

  const text = document.getElementById("reviewText").value;

  const payload = {
    student_id: studentId,
    vendor_id: currentOrder.vendor_id,
    menu_id: currentOrder.menu_id,
    rating,
    review_text: text,
    created_at: new Date().toISOString()
  };

  const { error } = await sb.from("reviews").upsert(payload);

  if (error) {
    console.error("Submit review error:", error);
    return;
  }

  closeModal();
  await load();
};

window.deleteReview = async () => {
  if (!currentOrder) return;

  const { error } = await sb
    .from("reviews")
    .delete()
    .eq("student_id", studentId)
    .eq("menu_id", currentOrder.menu_id);

  if (error) {
    console.error("Delete review error:", error);
    return;
  }

  closeModal();
  await load();
};
