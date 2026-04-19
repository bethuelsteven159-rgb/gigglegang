const SUPABASE_URL = 'https://mslvqduxmkuusuyaewej.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_KEY_HERE';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let orders = [];
let reviews = [];

let selectedOrderId = null;
let selectedRating = 0;

// ===============================
// LOAD
// ===============================
async function loadData() {

  const { data: o } = await sb.from("orders").select("*");
  const { data: r } = await sb.from("reviews").select("*");

  orders = o || [];
  reviews = r || [];

  render();
}

// ===============================
function render() {

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
              ? `<button onclick="openReviewModal(${order.id})">Review</button>`
              : `<span style="color:gray;">Locked</span>`
        }
      </td>
    `;

    tbody.appendChild(row);
  });
}

// ===============================
// MODAL CONTROL (ONLY ON BUTTON CLICK)
// ===============================
window.openReviewModal = (orderId) => {

  selectedOrderId = orderId;
  selectedRating = 0;

  document.getElementById("reviewModal").style.display = "flex";

  resetStars();
  resetTags();
  document.getElementById("reviewText").value = "";
};

window.closeReviewModal = () => {
  document.getElementById("reviewModal").style.display = "none";
};

// ===============================
// STAR SYSTEM
// ===============================
document.querySelectorAll(".star").forEach(s => {
  s.addEventListener("click", () => {
    selectedRating = parseInt(s.dataset.value);
    updateStars(selectedRating);
  });
});

function updateStars(r) {
  document.querySelectorAll(".star").forEach(s => {
    s.textContent = s.dataset.value <= r ? "★" : "☆";
  });
}

function resetStars() {
  document.querySelectorAll(".star").forEach(s => s.textContent = "☆");
}

// ===============================
// TAG SYSTEM (FIXED → inserts into textarea)
// ===============================
document.querySelectorAll(".tag").forEach(tag => {

  tag.addEventListener("click", () => {

    const text = tag.textContent;
    const textarea = document.getElementById("reviewText");

    // append tag into description (AUTO RESPONSE SYSTEM)
    if (!textarea.value.includes(text)) {
      textarea.value += (textarea.value ? ", " : "") + text;
    }

    // toggle active UI
    tag.classList.toggle("active");
  });
});

function resetTags() {
  document.querySelectorAll(".tag").forEach(t => t.classList.remove("active"));
}

// ===============================
// SUBMIT REVIEW (SUPABASE)
// ===============================
window.submitReview = async () => {

  if (!selectedOrderId || selectedRating === 0) return;

  const text = document.getElementById("reviewText").value;

  await sb.from("reviews").upsert({
    order_id: selectedOrderId,
    student_id: "demo-user",
    rating: selectedRating,
    text: text
  });

  closeReviewModal();
  loadData();
};

// ===============================
loadData();
