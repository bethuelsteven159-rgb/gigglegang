import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ==============================
// 🔑 SUPABASE CONFIG
// ==============================
const supabaseUrl = "YOUR_URL";
const supabaseKey = "YOUR_ANON_KEY";
const sb = createClient(supabaseUrl, supabaseKey);

// ==============================
// GLOBAL STATE (STUDENT)
// ==============================
let selectedRating = 0;
let currentOrderId = null;

// ==============================
// ⭐ STAR UI (STUDENT)
// ==============================
function initStars() {
  const stars = document.querySelectorAll(".star");

  stars.forEach(star => {
    star.addEventListener("click", () => {
      selectedRating = parseInt(star.dataset.value);

      stars.forEach(s => {
        const val = parseInt(s.dataset.value);
        s.textContent = val <= selectedRating ? "★" : "☆";
      });
    });
  });
}

// ==============================
// 🪟 MODAL CONTROL
// ==============================
window.openReviewModal = function(orderId) {
  currentOrderId = orderId;
  document.getElementById("reviewModal").style.display = "flex";
};

window.closeReviewModal = function() {
  document.getElementById("reviewModal").style.display = "none";
  selectedRating = 0;

  document.querySelectorAll(".star").forEach(s => {
    s.textContent = "☆";
  });
};

// ==============================
// 💾 SAVE REVIEW (SUPABASE)
// ==============================
async function saveReview(orderId, rating) {
  // check if exists
  const { data: existing } = await sb
    .from("reviews")
    .select("*")
    .eq("order_id", orderId)
    .single();

  if (existing) {
    return await sb
      .from("reviews")
      .update({ rating })
      .eq("order_id", orderId);
  }

  return await sb.from("reviews").insert([
    {
      order_id: orderId,
      rating: rating
    }
  ]);
}

// ==============================
// 📤 SUBMIT REVIEW (STUDENT)
// ==============================
window.submitReview = async function() {
  if (!currentOrderId || selectedRating === 0) {
    alert("Select a rating");
    return;
  }

  await saveReview(currentOrderId, selectedRating);

  closeReviewModal();

  // reload page so both student + vendor reflect
  location.reload();
};

// ==============================
// 📥 FETCH REVIEWS
// ==============================
async function getReviewMap() {
  const { data, error } = await sb.from("reviews").select("*");

  if (error) {
    console.error(error);
    return {};
  }

  const map = {};
  data.forEach(r => {
    map[r.order_id] = r.rating;
  });

  return map;
}

// ==============================
// ⭐ RENDER STARS
// ==============================
function getStars(rating) {
  if (!rating) return `<span class="review-none">No review</span>`;

  let html = `<div class="review-stars">`;

  for (let i = 1; i <= 5; i++) {
    html += i <= rating
      ? `<span class="filled">★</span>`
      : `<span class="empty">☆</span>`;
  }

  html += `</div>`;
  return html;
}

// ==============================
// 👨‍🎓 STUDENT HISTORY PAGE
// ==============================
async function loadStudentHistory() {
  const tbody = document.getElementById("historyBody");
  if (!tbody) return;

  const { data: orders } = await sb.from("orders").select("*");
  const reviewMap = await getReviewMap();

  tbody.innerHTML = "";

  orders.forEach(order => {
    const hasReview = reviewMap[order.id];

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${order.id}</td>
      <td>${order.vendor || "Vendor"}</td>
      <td>${order.items}</td>
      <td>${order.total}</td>
      <td>${order.status}</td>
      <td>${order.date || ""}</td>
      <td>
        ${
          hasReview
            ? getStars(hasReview)
            : `<button onclick="openReviewModal(${order.id})">Review</button>`
        }
      </td>
    `;

    tbody.appendChild(row);
  });

  initStars();
}

// ==============================
// 🧑‍🍳 VENDOR ORDERS PAGE
// ==============================
async function loadVendorOrders() {
  const tbody = document.getElementById("ordersBody");
  if (!tbody) return;

  const { data: orders } = await sb.from("orders").select("*");
  const reviewMap = await getReviewMap();

  tbody.innerHTML = "";

  orders.forEach(order => {
    const rating = reviewMap[order.id] || 0;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${order.id}</td>
      <td>${order.student_name || "Student"}</td>
      <td>${order.items}</td>
      <td>${order.total}</td>
      <td>${order.status}</td>
      <td><button>Update</button></td>
      <td>${getStars(rating)}</td>
    `;

    tbody.appendChild(row);
  });
}

// ==============================
// 🚀 AUTO PAGE DETECTION
// ==============================
window.addEventListener("DOMContentLoaded", () => {
  loadStudentHistory();  // only runs if table exists
  loadVendorOrders();    // only runs if table exists
});
