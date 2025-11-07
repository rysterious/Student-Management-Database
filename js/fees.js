// === Complete JavaScript Code for Fees Management (FULLY FIXED + EDIT MODAL SUPPORT) ===

const API_BASE = 'http://localhost:5000';

// Main UI Elements
const feesContainer = document.getElementById('feesContainer');
const statusFilter = document.getElementById('statusFilter');
const feesSearch = document.getElementById('feesSearch');
const addFeeBtn = document.getElementById('addFeeBtn');
const addFeeModal = document.getElementById('addFeeModal');
const cancelAddFee = document.getElementById('cancelAddFee');
const addFeeForm = document.getElementById('addFeeForm');
const historyModal = document.getElementById('historyModal');
const closeHistory = document.getElementById('closeHistory');
const historyContent = document.getElementById('historyContent');
const suggestionBox = document.getElementById('suggestionBox');
const historyDate = document.getElementById('historyDate');

// Edit Modal Elements (NEW)
const editHistoryModal = document.getElementById('editHistoryModal');
const editHistoryForm = document.getElementById('editHistoryForm');
const cancelEditHistory = document.getElementById('cancelEditHistory');
const closeEditHistory = document.getElementById('closeEditHistory');

let allFees = [];
let allStudents = [];
let suggestionIndex = -1;
let currentStudentId = '';
let autocompleteInitialized = false;

// =====================
// Fetch + Render
// =====================
async function fetchAllFees() {
  try {
    const res = await fetch(`${API_BASE}/fees/all`);
    allFees = await res.json();

    for (let fee of allFees) {
      if (fee.student_id) {
        try {
          const historyRes = await fetch(`${API_BASE}/fees/history/${fee.student_id}`);
          const history = await historyRes.json();

          if (history.length > 0) {
            history.sort((a, b) => new Date(b.date) - new Date(a.date));
            fee.amount = history[0].amount;
          }
        } catch (err) {
          console.error(`Failed to load history for student ${fee.student_id}:`, err);
        }
      }
    }

    renderFees(allFees);
  } catch (err) {
    console.error('Failed to load fees:', err);
  }
}

async function fetchStudents() {
  try {
    const res = await fetch(`${API_BASE}/students`);
    allStudents = await res.json();
    localStorage.setItem('allStudents', JSON.stringify(allStudents));
  } catch (err) {
    console.error('Failed to load students:', err);
    const storedStudents = localStorage.getItem('allStudents');
    if (storedStudents) {
      allStudents = JSON.parse(storedStudents);
    }
  }
}

function renderFees(fees) {
  feesContainer.innerHTML = '';
  fees.forEach(fee => {
    const row = document.createElement('div');
    row.className = "grid grid-cols-12 py-3 px-6 hover:bg-gray-700";
    row.innerHTML = `
      <div class="col-span-2">${fee.student_id || 'N/A'}</div>
      <div class="col-span-3">${fee.name}</div>
      <div class="col-span-2 ${fee.status === 'overdue' ? 'text-red-400' : fee.status === 'paid' ? 'text-green-400' : 'text-yellow-400'}">
        ${fee.status}
      </div>
      <div class="col-span-2">${fee.amount || '-'}</div>
      <div class="col-span-3 flex space-x-3">
        ${fee.status === 'unpaid' || fee.status === 'overdue' ? 
          `<button onclick="markPaid('${fee.student_id}', '${fee.amount || 0}')" class="px-3 py-1 bg-blue-600 rounded">Mark Paid</button>` : ''}
        <button onclick="viewHistory('${fee.student_id}')" class="px-3 py-1 bg-gray-600 rounded">History</button>
      </div>
    `;
    feesContainer.appendChild(row);
  });
}

// =====================
// Fee Actions
// =====================
async function markPaid(student_id, amount) {
  try {
    const paidRes = await fetch(`${API_BASE}/fees/paid`);
    const paidFees = await paidRes.json();
    const studentHistory = paidFees.filter(f => f.student_id === student_id);

    if (studentHistory.length === 0) {
      openAddFeeModalForStudent(student_id, amount, "paid");
      return;
    }

    const response = await fetch(`${API_BASE}/fees/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, amount })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to mark as paid');
    }

    alert('Fee marked as paid successfully!');
    fetchAllFees();
  } catch (err) {
    console.error('Failed to mark as paid:', err);
    alert('Failed to mark as paid: ' + err.message);
  }
}

function openAddFeeModalForStudent(student_id, amount = '', status = 'paid') {
  addFeeModal.classList.remove('hidden');

  const studentIdInput = addFeeForm.querySelector('input[name="student_id"]');
  const statusSelect = addFeeForm.querySelector('select[name="status"]');
  const amountInput = addFeeForm.querySelector('input[name="amount"]');
  const dateInput = addFeeForm.querySelector('input[name="date"]');

  if (studentIdInput) {
    const student = allStudents.find(s => s.student_id === student_id);
    if (student) {
      studentIdInput.value = `${student.name}: ${student.student_id}`;
    }
  }

  if (statusSelect) statusSelect.value = status;
  if (amountInput) amountInput.value = amount;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  if (dateInput) dateInput.value = today;
}

async function viewHistory(student_id) {
  currentStudentId = student_id;
  try {
    const paid = await (await fetch(`${API_BASE}/fees/history/${student_id}`)).json();

    if (paid.length === 0) {
      openAddFeeModalForStudent(student_id, '', 'paid');
      return;
    }

    renderHistoryContent(paid);
    historyModal.classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load history:', err);
    alert('Failed to load history: ' + err.message);
  }
}

function renderHistoryContent(filtered) {
  historyContent.innerHTML = '';

  if (filtered.length === 0) {
    historyContent.innerHTML = '<p class="text-gray-400">No payment history found.</p>';
    return;
  }

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  filtered.forEach((f, index) => {
    const historyItem = document.createElement('div');
    historyItem.className = "bg-gray-700 p-3 rounded relative";
    historyItem.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <p><strong>Date:</strong> ${f.date || 'N/A'}</p>
          <p><strong>Amount:</strong> ${f.amount}</p>
        </div>
        <div class="flex space-x-2">
          <button onclick="editPayment('${f.payment_id}', '${f.amount}', '${f.date}')" class="px-2 py-1 bg-yellow-600 text-white rounded text-sm">Edit</button>
          <button onclick="deletePayment('${f.payment_id}')" class="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
        </div>
      </div>
    `;
    historyContent.appendChild(historyItem);
  });
}

// ===== EDIT PAYMENT LOGIC =====
function editPayment(payment_id, amount, date) {
  const form = editHistoryForm;
  form.querySelector('input[name="payment_id"]').value = payment_id;
  form.querySelector('input[name="amount"]').value = amount;
  form.querySelector('input[name="date"]').value = date;

  editHistoryModal.classList.remove('hidden');
}

async function deletePayment(payment_id) {
  if (!confirm('Are you sure you want to delete this payment?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/fees/delete/${payment_id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete payment');
    }

    alert('Payment deleted successfully!');
    viewHistory(currentStudentId);
    fetchAllFees();
  } catch (err) {
    console.error('Failed to delete payment:', err);
    alert('Failed to delete payment: ' + err.message);
  }
}

// =====================
// Filtering + Search
// =====================
statusFilter.addEventListener('change', () => {
  const filtered = statusFilter.value === 'all'
    ? allFees
    : allFees.filter(f => f.status === statusFilter.value);
  renderFees(filtered);
});

feesSearch.addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  const filtered = allFees.filter(f =>
    f.name.toLowerCase().includes(term) ||
    (f.student_id && f.student_id.toLowerCase().includes(term))
  );
  renderFees(filtered);
});

// =====================
// Add Fee Modal
// =====================
addFeeBtn?.addEventListener('click', () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  const dateInput = addFeeForm.querySelector('input[name="date"]');
  if (dateInput) dateInput.value = today;

  const statusSelect = addFeeForm.querySelector('select[name="status"]');
  if (statusSelect) statusSelect.value = "paid";

  addFeeModal.classList.remove('hidden');
});

cancelAddFee?.addEventListener('click', () => {
  addFeeModal.classList.add('hidden');
  clearAddFeeForm();
});

function clearAddFeeForm() {
  const form = addFeeForm;
  const studentIdInput = form.querySelector('input[name="student_id"]');
  const amountInput = form.querySelector('input[name="amount"]');
  const dateInput = form.querySelector('input[name="date"]');
  const statusSelect = form.querySelector('select[name="status"]');

  if (studentIdInput) studentIdInput.value = '';
  if (amountInput) amountInput.value = '';
  if (dateInput) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
  }
  if (statusSelect) statusSelect.value = 'paid';

  suggestionBox.classList.add('hidden');
}

addFeeForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(addFeeForm).entries());
  if (data.status !== 'paid') delete data.date;

  const inputValue = data.student_id;
  const colonIndex = inputValue.lastIndexOf(':');
  let student_id;

  if (colonIndex !== -1) {
    student_id = inputValue.substring(colonIndex + 1).trim();
    data.student_id = student_id;
  }

  try {
    const response = await fetch(`${API_BASE}/fees/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add fee');
    }

    if (student_id && data.amount) {
      const feeIndex = allFees.findIndex(f => f.student_id === student_id);
      if (feeIndex !== -1) {
        allFees[feeIndex].amount = parseFloat(data.amount);
        allFees[feeIndex].status = data.status || "paid";
        renderFees(allFees);
      }
    }

    addFeeModal.classList.add('hidden');
    clearAddFeeForm();
    alert('Fee added successfully!');
  } catch (err) {
    console.error('Failed to add fee:', err);
    alert('Failed to add fee: ' + err.message);
  }
});

// =====================
// Edit History Modal
// =====================
editHistoryForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(editHistoryForm);
  const payment_id = formData.get('payment_id');
  const amount = parseFloat(formData.get('amount'));
  const date = formData.get('date');

  try {
    const response = await fetch(`${API_BASE}/fees/update/${payment_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, date })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update payment');
    }

    alert('Payment updated successfully!');
    editHistoryModal.classList.add('hidden');
    viewHistory(currentStudentId);
    fetchAllFees();
  } catch (err) {
    console.error('Failed to update payment:', err);
    alert('Failed to update payment: ' + err.message);
  }
});

cancelEditHistory?.addEventListener('click', () => {
  editHistoryModal.classList.add('hidden');
});

closeEditHistory?.addEventListener('click', () => {
  editHistoryModal.classList.add('hidden');
});

editHistoryModal?.addEventListener('click', e => {
  if (e.target === editHistoryModal) {
    editHistoryModal.classList.add('hidden');
  }
});

// =====================
// History & Other Modals
// =====================
closeHistory?.addEventListener('click', () => historyModal.classList.add('hidden'));

[addFeeModal, historyModal].forEach(modal => {
  modal?.addEventListener('click', e => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    addFeeModal.classList.add('hidden');
    historyModal.classList.add('hidden');
    editHistoryModal.classList.add('hidden');
    suggestionBox.classList.add('hidden');
  }
});

// =====================
// 🔥 FIXED: Global Keypress (won't steal focus from inputs/modals)
// =====================
document.addEventListener('keypress', e => {
  const activeEl = document.activeElement;

  if (
    activeEl.tagName === 'INPUT' ||
    activeEl.tagName === 'TEXTAREA' ||
    activeEl.tagName === 'SELECT'
  ) {
    return;
  }

  if (
    !addFeeModal.classList.contains('hidden') ||
    !historyModal.classList.contains('hidden') ||
    !editHistoryModal.classList.contains('hidden')
  ) {
    return;
  }

  if (e.key.length === 1 && /\w/.test(e.key)) {
    feesSearch.focus();
    feesSearch.value += e.key;
    feesSearch.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

// =====================
// Autocomplete
// =====================
function setupNameAutocomplete() {
  if (autocompleteInitialized) return;
  autocompleteInitialized = true;

  const studentIdInput = addFeeForm.querySelector('input[name="student_id"]');
  if (!studentIdInput) return;

  studentIdInput.addEventListener('input', () => {
    const query = studentIdInput.value.toLowerCase();
    suggestionIndex = -1;
    suggestionBox.innerHTML = '';

    if (!query) {
      suggestionBox.classList.add('hidden');
      return;
    }

    const matches = allStudents.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.student_id && s.student_id.toLowerCase().includes(query))
    );

    if (matches.length === 0) {
      suggestionBox.classList.add('hidden');
      return;
    }

    matches.forEach((s, i) => {
      const option = document.createElement('div');
      option.className = "px-3 py-2 cursor-pointer hover:bg-gray-700";
      option.textContent = `${s.name}: ${s.student_id || 'N/A'}`;
      option.dataset.value = `${s.name}: ${s.student_id || 'N/A'}`;
      option.addEventListener('click', () => {
        studentIdInput.value = `${s.name}: ${s.student_id || 'N/A'}`;
        suggestionBox.classList.add('hidden');
      });
      suggestionBox.appendChild(option);
    });

    suggestionBox.classList.remove('hidden');
  });

  studentIdInput.addEventListener('keydown', e => {
    const items = suggestionBox.querySelectorAll('div');
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      suggestionIndex = (suggestionIndex + 1) % items.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      suggestionIndex = (suggestionIndex - 1 + items.length) % items.length;
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestionIndex >= 0) {
        studentIdInput.value = items[suggestionIndex].dataset.value;
        suggestionBox.classList.add('hidden');
      }
      return;
    } else if (e.key === "Escape") {
      suggestionBox.classList.add('hidden');
      return;
    }

    items.forEach((item, idx) => {
      item.classList.toggle("bg-gray-700", idx === suggestionIndex);
    });
  });

  document.addEventListener('click', e => {
    if (!studentIdInput.contains(e.target) && !suggestionBox.contains(e.target)) {
      suggestionBox.classList.add('hidden');
    }
  });
}

// =====================
// History Date Filter
// =====================
historyDate?.addEventListener('change', async () => {
  const selectedMonth = historyDate.value;
  if (!selectedMonth) {
    viewHistory(currentStudentId);
    return;
  }

  try {
    const paid = await (await fetch(`${API_BASE}/fees/history/${currentStudentId}`)).json();
    const filtered = paid.filter(p => p.date.startsWith(selectedMonth));
    renderHistoryContent(filtered);
  } catch (err) {
    console.error('Failed to filter history:', err);
  }
});

// =====================
// Init
// =====================
document.addEventListener('DOMContentLoaded', async () => {
  const storedStudents = localStorage.getItem('allStudents');
  if (storedStudents) {
    allStudents = JSON.parse(storedStudents);
  }

  await fetchStudents();
  setupNameAutocomplete();
  fetchAllFees();

  setInterval(async () => {
    try {
      await fetch(`${API_BASE}/fees/check_overdue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      fetchAllFees();
    } catch (err) {
      console.error('Failed to check overdue fees:', err);
    }
  }, 24 * 60 * 60 * 1000);
});
