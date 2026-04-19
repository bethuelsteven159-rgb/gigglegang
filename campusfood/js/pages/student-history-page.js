import { sb } from "../config/supabase.js";
import { getUserId } from "../shared/auth.js";

let orders = [];
let reviews = [];

let currentOrder = null;
let rating = 0;

const st_id = getUserId();

// ===============================
export async function initStudentHistoryPage() {
  await load();
  bindEvents();
}

// ===============================
async function load() {
  const { data: o } = await sb.from("orders").select("*").eq("st_id", st_id);
  const { data: r } = await sb.from("reviews").select("*").eq("st_id", st_id);

  orders = o || [];
  reviews = r || [];

  render();
}

// ===============================
function render() {
  const body = document.getElementById("historyBody");
  body.innerHTML = "";

  orders.forEach(order => {
    const review = reviews.find(r => r.menu_id === order.menu_id);

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${order.id}</td>
      <td>${order.vendor}</td>
      <td>${order.items}</td>
      <td>${order.total}</td>
      <td>${order.status}</td>
      <td>${order.date}</td>
      <td>
        ${
          review
            ? `<button data-id="${order.id}" class="editBtn">Edit</button>`
            : order.status === "Delivered"
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

  // open modal (event delegation)
  document.addEventListener("click", (e) => {

    if (e.target.classList.contains("reviewBtn") ||
        e.target.classList.contains("editBtn")) {
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

// ===============================
function updateStars(value) {
  document.querySelectorAll(".star").forEach(s => {
    s.textContent = s.dataset.value <= value ? "★" : "☆";
  });
}

// ===============================
window.openModal = (id) => {
  currentOrder = orders.find(o => o.id == id);
  rating = 0;

  document.getElementById("reviewText").value = "";
  updateStars(0);

  document.getElementById("reviewModal").style.display = "flex";
};

// ===============================
window.closeModal = () => {
  document.getElementById("reviewModal").style.display = "none";
};

// ===============================
window.submitReview = async () => {

  const text = document.getElementById("reviewText").value;

  await sb.from("reviews").upsert({
    st_id,
    ven_id: currentOrder.ven_id,
    menu_id: currentOrder.menu_id,
    rating,
    review_text: text,
    created_at: new Date()
  });

  closeModal();
  load();
};

// ===============================
window.deleteReview = async () => {

  await sb
    .from("reviews")
    .delete()
    .eq("st_id", st_id)
    .eq("menu_id", currentOrder.menu_id);

  closeModal();
  load();
};
