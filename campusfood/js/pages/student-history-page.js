import { sb } from "../config/supabase.js";
import { getUserId } from "../shared/auth.js";

let orders = [];
let reviews = [];

let currentOrder = null;
let rating = 0;

const studentId = getUserId();

export async function initStudentHistoryPage() {
  await load();
  bindEvents();
}

async function load() {
  const { data: o, error: ordersError } = await sb
    .from("orders")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  const { data: r, error: reviewsError } = await sb
    .from("reviews")
    .select("*")
    .eq("student_id", studentId);

  console.log("studentId:", studentId);
  console.log("orders:", o);
  console.log("ordersError:", ordersError);
  console.log("reviews:", r);
  console.log("reviewsError:", reviewsError);

  orders = o || [];
  reviews = r || [];

  render();
}

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
      ? order.items.map(i => i.name || "Item").join(", ")
      : order.items || "";

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${order.order_number || order.id}</td>
      <td>${order.vendor_id}</td>
      <td>${itemsText}</td>
      <td>R${order.total_price}</td>
      <td>${order.status}</td>
      <td>${new Date(order.created_at).toLocaleString()}</td>
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

function bindEvents() {
  document.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("reviewBtn") ||
      e.target.classList.contains("editBtn")
    ) {
      openModal(e.target.dataset.id);
    }

    if (e.target.classList.contains("star")) {
      rating = parseInt(e.target.dataset.value);
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
  document.querySelectorAll(".star").forEach(s => {
    s.textContent = s.dataset.value <= value ? "★" : "☆";
  });
}

window.openModal = (id) => {
  currentOrder = orders.find(o => o.id == id);
  rating = 0;

  document.getElementById("reviewText").value = "";
  updateStars(0);

  document.getElementById("reviewModal").style.display = "flex";
};

window.closeModal = () => {
  document.getElementById("reviewModal").style.display = "none";
};

window.closeReviewModal = window.closeModal;

window.submitReview = async () => {
  const text = document.getElementById("reviewText").value;

  await sb.from("reviews").upsert({
    student_id: studentId,
    vendor_id: currentOrder.vendor_id,
    menu_id: currentOrder.menu_id,
    rating,
    review_text: text,
    created_at: new Date().toISOString()
  });

  closeModal();
  load();
};

window.deleteReview = async () => {
  await sb
    .from("reviews")
    .delete()
    .eq("student_id", studentId)
    .eq("menu_id", currentOrder.menu_id);

  closeModal();
  load();
};
