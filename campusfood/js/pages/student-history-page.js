import { sb } from "../config/supabase.js";

let orders = [];
let reviews = [];
let currentOrder = null;
let rating = 0;

// ===============================
export async function initStudentHistoryPage() {
  await load();
  bindEvents();
}

// ===============================
async function getCurrentStudentId() {
  const { data, error } = await sb.auth.getSession();

  if (error) {
    console.error("Auth session error:", error);
    return null;
  }

  const user = data?.session?.user || null;
  console.log("Logged in user:", user);

  return user?.id || null;
}

// ===============================
async function load() {
  const studentId = await getCurrentStudentId();
  console.log("studentId inside load:", studentId);

  const body = document.getElementById("historyBody");
  if (!body) return;

  if (!studentId) {
    body.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:1.5rem;">
          Could not find logged in student
        </td>
      </tr>
    `;
    return;
  }

  const { data: o, error: ordersError } = await sb
    .from("orders")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  const { data: r, error: reviewsError } = await sb
    .from("reviews")
    .select("*")
    .eq("student_id", studentId);

  console.log("orders:", o);
  console.log("ordersError:", ordersError);
  console.log("reviews:", r);
  console.log("reviewsError:", reviewsError);

  if (ordersError) {
    body.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:1.5rem;">
          Failed to load order history
        </td>
      </tr>
    `;
    return;
  }

  orders = o || [];
  reviews = r || [];

  render();
}

// ===============================
function render() {
  const body = document.getElementById("historyBody");
  if (!body) return;

  body.innerHTML = "";

  if (!orders.length) {
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

    const itemsText = Array.isArray(order.items)
      ? order.items.map(i => i.name || i.title || "Item").join(", ")
      : (order.items || "");

    const totalText = order.total_price != null ? `R${order.total_price}` : "R0";

    const dateText = order.created_at
      ? new Date(order.created_at).toLocaleString()
      : "";

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${order.order_number || order.id}</td>
      <td>${order.vendor_id || ""}</td>
      <td>${itemsText}</td>
      <td>${totalText}</td>
      <td>${order.status || ""}</td>
      <td>${dateText}</td>
      <td>
        ${
          review
            ? `<button data-id="${order.id}" class="editBtn">Edit</button>`
            : (order.status === "Delivered" || order.status === "Completed")
              ? `<button data-id="${order.id}" class="reviewBtn">Review</button>`
              : "Locked"
        }
      </td>
    `;

    body.appendChild(row);
  });
}

// ===============================
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

// ===============================
function updateStars(value) {
  document.querySelectorAll(".star").forEach(s => {
    s.textContent = Number(s.dataset.value) <= value ? "★" : "☆";
  });
}

// ===============================
window.openModal = (id) => {
  currentOrder = orders.find(o => String(o.id) === String(id));
  if (!currentOrder) return;

  rating = 0;

  const reviewText = document.getElementById("reviewText");
  if (reviewText) reviewText.value = "";

  updateStars(0);

  const modal = document.getElementById("reviewModal");
  if (modal) modal.style.display = "flex";
};

// ===============================
window.closeModal = () => {
  const modal = document.getElementById("reviewModal");
  if (modal) modal.style.display = "none";
};

// for HTML compatibility
window.closeReviewModal = window.closeModal;

// ===============================
window.submitReview = async () => {
  const studentId = await getCurrentStudentId();
  if (!studentId || !currentOrder) return;

  const text = document.getElementById("reviewText").value;

  const { error } = await sb.from("reviews").upsert({
    student_id: studentId,
    vendor_id: currentOrder.vendor_id,
    menu_id: currentOrder.menu_id,
    rating,
    review_text: text,
    created_at: new Date().toISOString()
  });

  if (error) {
    console.error("submitReview error:", error);
    return;
  }

  closeModal();
  await load();
};

// ===============================
window.deleteReview = async () => {
  const studentId = await getCurrentStudentId();
  if (!studentId || !currentOrder) return;

  const { error } = await sb
    .from("reviews")
    .delete()
    .eq("student_id", studentId)
    .eq("menu_id", currentOrder.menu_id);

  if (error) {
    console.error("deleteReview error:", error);
    return;
  }

  closeModal();
  await load();
};
