const API_BASE = 'http://localhost:5000';

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

let allFees = [];
let allStudents = [];
let suggestionIndex = -1;

// =====================
// Fetch + Render
// =====================
async function fetchAllFees() {
  try {
    const res = await fetch(`${API_BASE}/fees/all`);
    allFees = await res.json();
    renderFees(allFees);
  } catch (err) {
    console.error('Failed to load fees:', err);
  }
}

async function fetchStudents() {
  try {
    const res = await fetch(`${API_BASE}/students`);
    allStudents = await res.json();
  } catch (err) {
    console.error('Failed to load students:', err);
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
// Fee actions
// =====================
async function markPaid(student_id, amount) {
  try {
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

async function viewHistory(student_id) {
  try {
    const paid = await (await fetch(`${API_BASE}/fees/paid`)).json();
    const filtered = paid.filter(f => f.student_id === student_id);

    if (filtered.length === 0) {
      // Open add fee modal if no history
      addFeeModal.classList.remove('hidden');
      const studentIdInput = addFeeForm.querySelector('input[name="student_id"]');
      if (studentIdInput) {
        const student = allStudents.find(s => s.student_id === student_id);
        if (student) {
          studentIdInput.value = `${student.name}: ${student.student_id}`;
        }
      }
      return;
    }

    historyContent.innerHTML = filtered.map(f => `
      <div class="bg-gray-700 p-3 rounded">
        <p><strong>Date:</strong> ${f.date || 'N/A'}</p>
        <p><strong>Amount:</strong> ${f.amount}</p>
      </div>
    `).join('');

    historyModal.classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load history:', err);
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
  const today = new Date().toISOString().split('T')[0];
  const dateInput = addFeeForm.querySelector('input[name="date"]');
  if (dateInput) dateInput.value = today;

  const statusSelect = addFeeForm.querySelector('select[name="status"]');
  if (statusSelect) statusSelect.value = "paid";

  addFeeModal.classList.remove('hidden');
});

cancelAddFee?.addEventListener('click', () => {
  addFeeModal.classList.add('hidden');
  suggestionBox.classList.add('hidden');
});

addFeeForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(addFeeForm).entries());
  if (data.status !== 'paid') delete data.date;
  
  // Extract student_id from the input (format: name: student_id)
  const inputValue = data.student_id;
  const colonIndex = inputValue.lastIndexOf(':');
  if (colonIndex !== -1) {
    data.student_id = inputValue.substring(colonIndex + 1).trim();
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
    
    addFeeModal.classList.add('hidden');
    addFeeForm.reset();
    fetchAllFees();
    alert('Fee added successfully!');
  } catch (err) {
    console.error('Failed to add fee:', err);
    alert('Failed to add fee: ' + err.message);
  }
});

// =====================
// History Modal
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
    suggestionBox.classList.add('hidden');
  }
});

// =====================
// Search Autofocus (letters only)
// =====================
document.addEventListener('keypress', e => {
  if (document.activeElement === feesSearch) return;
  if (e.key.length === 1 && /\w/.test(e.key)) {
    feesSearch.focus();
    feesSearch.value += e.key;
    const event = new Event('input', { bubbles: true });
    feesSearch.dispatchEvent(event);
  }
});

// =====================
// Autocomplete for student name:ID
// =====================
function setupNameAutocomplete() {
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
// Init
// =====================
document.addEventListener('DOMContentLoaded', async () => {
  await fetchStudents();
  setupNameAutocomplete();
  fetchAllFees();
  
  // Check for overdue fees every day
  setInterval(async () => {
    try {
      await fetch(`${API_BASE}/fees/check_overdue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      fetchAllFees(); // Refresh the list
    } catch (err) {
      console.error('Failed to check overdue fees:', err);
    }
  }, 24 * 60 * 60 * 1000); // Check once per day
});