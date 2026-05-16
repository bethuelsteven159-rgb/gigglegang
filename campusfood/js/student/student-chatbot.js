const studentQuestions = {
  placeOrder: {
    question: "How do I place an order?",
    answer: "Go to the Student Dashboard, browse available menu items, add food to your cart, then click Checkout."
  },
  payOrder: {
    question: "How do I pay for my order?",
    answer: "After checkout, click Pay Now. You will be redirected to the payment page. Your order is confirmed after successful payment."
  },
  trackOrder: {
    question: "How do I track my order?",
    answer: "Open My Orders to see your order status in real time."
  },
  orderStatuses: {
    question: "What do the order statuses mean?",
    answer: "Order Placed means your order was received. Being Prepared means the vendor is preparing it. Ready for Collection means you can pick it up. Completed means the order is finished."
  },
  foodReady: {
    question: "How do I know when my food is ready?",
    answer: "You will receive a notification when your order status changes to Ready for Collection."
  },
  cancelOrder: {
    question: "How do I cancel an order?",
    answer: "Go to My Orders and click Cancel if cancellation is still allowed."
  },
  refund: {
    question: "How do refunds work?",
    answer: "If you cancel a paid order within the allowed time, the system creates a refund request and tracks the refund status."
  },
  allergens: {
    question: "How do I view allergen information?",
    answer: "Allergen badges appear on menu items, such as Contains Nuts, Contains Dairy, or Gluten-Free."
  },
  dietary: {
    question: "How do I know if food is Halal, Vegan, or Gluten-Free?",
    answer: "Dietary badges are shown on each menu item, such as Halal, Vegan, Vegetarian, or Gluten-Free."
  },
  multiVendor: {
    question: "Can I order from more than one vendor?",
    answer: "For now, please order from one vendor at a time so payment and order tracking stay simple."
  },
  paymentFailed: {
    question: "What should I do if payment fails?",
    answer: "Try again from checkout. If money was deducted but the order was not confirmed, contact support with your payment reference."
  },
  delayedOrder: {
    question: "What should I do if my order is delayed?",
    answer: "Check My Orders for the latest status. If it remains delayed, contact the vendor or support."
  }
};

let studentChatName = "";

function addChatMessage(sender, message) {
  const chatMessages = document.getElementById("chatMessages");
  chatMessages.innerHTML += `<p><strong>${sender}:</strong> ${message}</p>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function openChat() {
  const chatBox = document.getElementById("chatBox");
  const chatMessages = document.getElementById("chatMessages");

  chatBox.style.display = "block";

  if (chatMessages.innerHTML.trim() === "") {
    addChatMessage("Assistant", "Welcome, who am I talking to?");
  }
}

function closeChat() {
  document.getElementById("chatBox").style.display = "none";
}

function saveStudentName() {
  const input = document.getElementById("studentNameInput");
  const name = input.value.trim();

  if (!name) {
    addChatMessage("Assistant", "Please enter your name first.");
    return;
  }

  studentChatName = name;

  addChatMessage("You", name);
  addChatMessage(
    "Assistant",
    `Hey ${name}, thanks for using Uni-Eats 🍔. I’m here to help you use the app easily. How can I help you today?`
  );

  document.getElementById("nameArea").style.display = "none";
  document.getElementById("questionArea").style.display = "block";

  loadStudentQuestions();
}

function loadStudentQuestions() {
  const questionSelect = document.getElementById("questionSelect");
  questionSelect.innerHTML = `<option value="">Choose a question</option>`;

  Object.keys(studentQuestions).forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = studentQuestions[key].question;
    questionSelect.appendChild(option);
  });
}

function answerQuestion() {
  const selectedKey = document.getElementById("questionSelect").value;

  if (!selectedKey) {
    addChatMessage("Assistant", "Please choose a question first.");
    return;
  }

  const selected = studentQuestions[selectedKey];

  addChatMessage("You", selected.question);
  addChatMessage("Assistant", selected.answer);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("chatBtn")?.addEventListener("click", openChat);
  document.getElementById("closeChat")?.addEventListener("click", closeChat);
  document.getElementById("saveNameBtn")?.addEventListener("click", saveStudentName);
  document.getElementById("askBtn")?.addEventListener("click", answerQuestion);
});