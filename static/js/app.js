let categoryChart = null;
let trendChart = null;

const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Housing & Rent",
  "Transportation",
  "Shopping",
  "Bills & Utilities",
  "Entertainment",
  "Healthcare",
  "Investments",
  "Other"
];

const INCOME_CATEGORIES = [
  "Salary & Income",
  "Freelance",
  "Investments",
  "Gifts & Grants",
  "Other"
];

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const currentMonth = `${yyyy}-${mm}`;

  const picker = document.getElementById("monthPicker");
  picker.value = currentMonth;
  document.getElementById("formDate").value = today.toISOString().split("T")[0];

  updateCategoryOptions();
  refreshAll();
});

function handleMonthChange() {
  refreshAll();
}

function handleFilterChange() {
  loadTransactions();
}

let searchDebounce = null;
function handleSearch() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    loadTransactions();
  }, 250);
}

async function refreshAll() {
  await Promise.all([loadAnalytics(), loadTransactions()]);
}

async function loadAnalytics() {
  const month = document.getElementById("monthPicker").value;
  try {
    const res = await fetch(`/api/analytics?month=${month}`);
    const data = await res.json();

    // Populate Metrics
    document.getElementById("metricIncome").innerText = `₹${data.total_income.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById("metricExpense").innerText = `₹${data.total_expense.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    
    const netEl = document.getElementById("metricNet");
    netEl.innerText = `₹${data.net_balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    netEl.className = data.net_balance >= 0 ? "metric-value green" : "metric-value red";

    document.getElementById("metricSavingsRate").innerText = `Savings Rate: ${data.savings_rate}%`;

    // Budget
    const budgetPct = data.budget_used_pct;
    document.getElementById("metricBudgetPct").innerText = `${budgetPct}%`;
    document.getElementById("metricBudgetRatio").innerText = `₹${data.total_expense.toLocaleString('en-IN')} / ₹${data.budget_amount.toLocaleString('en-IN')} budget`;

    const fill = document.getElementById("budgetBarFill");
    fill.style.width = `${Math.min(budgetPct, 100)}%`;
    if (budgetPct > 100) {
      fill.style.background = 'var(--red)';
    } else if (budgetPct > 75) {
      fill.style.background = 'var(--warning)';
    } else {
      fill.style.background = 'linear-gradient(90deg, var(--green), var(--cyan))';
    }

    // Render Charts
    renderCategoryChart(data.categories);
    renderTrendChart(data.daily_trend);
  } catch (e) {
    console.error(e);
  }
}

function renderCategoryChart(categories) {
  const ctx = document.getElementById("categoryChart").getContext("2d");
  if (categoryChart) categoryChart.destroy();

  const labels = categories.map(c => c.category);
  const amounts = categories.map(c => c.amount);

  const colors = [
    "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", 
    "#a855f7", "#3b82f6", "#ec4899", "#84cc16"
  ];

  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels.length ? labels : ["No Expenses"],
      datasets: [{
        data: amounts.length ? amounts : [1],
        backgroundColor: amounts.length ? colors.slice(0, labels.length) : ["#1e293b"],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: { color: "#94a3b8", font: { family: "Plus Jakarta Sans", size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ₹${ctx.parsed.toLocaleString('en-IN')}`
          }
        }
      },
      cutout: "68%"
    }
  });
}

function renderTrendChart(trend) {
  const ctx = document.getElementById("trendChart").getContext("2d");
  if (trendChart) trendChart.destroy();

  const labels = trend.map(t => t.day.slice(5)); // MM-DD
  const incomeData = trend.map(t => t.income);
  const expenseData = trend.map(t => t.expense);

  trendChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Income (₹)",
          data: incomeData,
          backgroundColor: "rgba(16, 185, 129, 0.75)",
          borderRadius: 6
        },
        {
          label: "Expense (₹)",
          data: expenseData,
          backgroundColor: "rgba(244, 63, 94, 0.75)",
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: "#64748b" },
          grid: { display: false }
        },
        y: {
          ticks: { color: "#64748b" },
          grid: { color: "rgba(255, 255, 255, 0.05)" }
        }
      },
      plugins: {
        legend: {
          position: "top",
          labels: { color: "#94a3b8" }
        }
      }
    }
  });
}

async function loadTransactions() {
  const month = document.getElementById("monthPicker").value;
  const cat = document.getElementById("categoryFilter").value;
  const type = document.getElementById("typeFilter").value;
  const q = document.getElementById("txSearch").value.trim();

  const url = `/api/transactions?month=${month}&category=${encodeURIComponent(cat)}&type=${type}&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const rows = data.transactions || [];

    const badge = document.getElementById("txCountBadge");
    badge.innerText = `${rows.length} transactions`;

    const tbody = document.getElementById("txTableBody");
    const empty = document.getElementById("txEmpty");

    if (rows.length === 0) {
      tbody.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.day}</td>
        <td><span class="cat-badge">${escapeHtml(r.category)}</span></td>
        <td>${escapeHtml(r.note || "—")}</td>
        <td><small class="text-dim">${escapeHtml(r.payment_method || "UPI")}</small></td>
        <td class="amount-cell ${r.type}">
          ${r.type === 'income' ? '+' : '-'}₹${Number(r.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}
        </td>
        <td>
          <button class="btn-del" onclick="deleteTx(${r.id})" title="Delete entry">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `).join("");
  } catch (e) {
    console.error(e);
  }
}

function updateCategoryOptions() {
  const selectedType = document.querySelector('input[name="txType"]:checked').value;
  const select = document.getElementById("formCategory");
  const list = selectedType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  select.innerHTML = list.map(c => `<option value="${c}">${c}</option>`).join("");
}

function openAddModal() {
  document.getElementById("txForm").reset();
  document.getElementById("formDate").value = new Date().toISOString().split("T")[0];
  document.querySelector('input[name="txType"][value="expense"]').checked = true;
  updateCategoryOptions();
  document.getElementById("addModal").classList.remove("hidden");
}

function closeAddModal() {
  document.getElementById("addModal").classList.add("hidden");
}

async function submitTransaction(e) {
  e.preventDefault();
  const type = document.querySelector('input[name="txType"]:checked').value;
  const amount = parseFloat(document.getElementById("formAmount").value);
  const day = document.getElementById("formDate").value;
  const category = document.getElementById("formCategory").value;
  const payment_method = document.getElementById("formMethod").value;
  const note = document.getElementById("formNote").value.trim();

  try {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount, day, category, payment_method, note })
    });
    if (res.ok) {
      closeAddModal();
      showToast("Transaction saved successfully!", "success");
      await refreshAll();
    }
  } catch (err) {
    showToast("Error saving transaction", "error");
  }
}

async function deleteTx(id) {
  if (!confirm("Are you sure you want to delete this record?")) return;
  try {
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Transaction deleted", "info");
      await refreshAll();
    }
  } catch (err) {
    showToast("Failed to delete", "error");
  }
}

// Budget Modal
function openBudgetModal() {
  document.getElementById("budgetModal").classList.remove("hidden");
}

function closeBudgetModal() {
  document.getElementById("budgetModal").classList.add("hidden");
}

async function submitBudget(e) {
  e.preventDefault();
  const month = document.getElementById("monthPicker").value;
  const budget_amount = parseFloat(document.getElementById("budgetInput").value);

  try {
    const res = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, budget_amount })
    });
    if (res.ok) {
      closeBudgetModal();
      showToast("Budget updated!", "success");
      await loadAnalytics();
    }
  } catch (e) {
    showToast("Failed to save budget", "error");
  }
}

// Toast
function showToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `<i class="fa-solid fa-circle-check text-cyan"></i> <span>${escapeHtml(msg)}</span>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
