// ===============================
// SUPABASE CLIENT
// ===============================
const SUPABASE_URL = 'https://mslvqduxmkuusuyaewej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbHZxZHV4bWt1dXN1eWFld2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODkzNDcsImV4cCI6MjA5MTU2NTM0N30.VxvR39nI5lNK_JZ6fwctQJgAH06YhbCTd8bXuiLpJgs';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// STATE
// ===============================
let orders = [];
let reviews = [];
let selectedOrderId = null;
let selectedRating = 0;

// assume logged-in student
const studentId = localStorage.getItem("user_id") || "demo-user";

// ===============================
// LOAD DATA
// ===============================
async function loadData() {

  // ORDERS
  const { data: orderData } = await sb
    .from("orders")
    .select("*")
    .eq("student_id", studentId);

  orders = orderData || [];

  // REVIEWS
  const { data: reviewData } = await sb
    .from("reviews")
    .select("*")
    .eq("student_id", studentId);

  reviews = reviewData || [];

  renderTable();
}

// ===============================
// RENDER TABLE
// ===============================
function renderTable() {
  const tbody = document.getElementById("historyBody");
  tbody.innerHTML = "";

  orders.forEach(order => {

    const review = reviews.find(r => r.order_id === order.id);

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
            ? `<span style="color:green;">★ ${review.rating}</span>`
            : order.status === "Delivered"
              ? `<button onclick="openReview(${order.id})">Review</button>`
              : `<span style="color:gray;">Locked</span>`
        }
      </td>
    `;

    tbody.appendChild(row);
  });
}

// ===============================
// REVIEW MODAL
// ===============================
window.openReview = (orderId) => {
  selectedOrderId = orderId;
  selectedRating = 0;

  document.getElementById("reviewModal").style.display = "flex";
  resetStars();
};

window.closeReviewModal = () => {
  document.getElementById("reviewModal").style.display = "none";
};

// ===============================
// STAR RATING
// ===============================
document.querySelectorAll(".star").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    updateStars(selectedRating);
  });
});

function updateStars(rating) {
  document.querySelectorAll(".star").forEach(s => {
    s.textContent = s.dataset.value <= rating ? "★" : "☆";
  });
}

function resetStars() {
  document.querySelectorAll(".star").forEach(s => s.textContent = "☆");
}

// ===============================
// SUBMIT REVIEW (SUPABASE)
// ===============================
window.submitReview = async () => {

  if (!selectedOrderId || selectedRating === 0) return;

  const text = document.getElementById("reviewText").value;

  // UPSERT = ensures ONLY ONE review per order per user
  const { error } = await sb
    .from("reviews")
    .upsert({
      order_id: selectedOrderId,
      student_id: studentId,
      rating: selectedRating,
      text: text
    });

  if (error) {
    console.error(error);
    return;
  }

  closeReviewModal();
  loadData();
};

// ===============================
// INIT
// ===============================
loadData();
