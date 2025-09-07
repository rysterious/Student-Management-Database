// API Base URL
const API_BASE = 'http://localhost:5000';

// DOM Elements
const studentsContainer = document.getElementById('studentsContainer');
const loadingElement = document.getElementById('loading');
const emptyStateElement = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const addStudentBtn = document.getElementById('addStudentBtn');
const studentModal = document.getElementById('studentModal');
const closeModal = document.getElementById('closeModal');
const studentDetails = document.getElementById('studentDetails');
const addFirstStudent = document.getElementById('addFirstStudent');
const editModal = document.getElementById('editModal');
const closeEditModal = document.getElementById('closeEditModal');
const cancelEdit = document.getElementById('cancelEdit');
const editForm = document.getElementById('editForm');
const addModal = document.getElementById('addModal');
const closeAddModal = document.getElementById('closeAddModal');
const addForm = document.getElementById('addForm');

// Filter Elements
const filterBtn = document.getElementById('filterBtn');
const filterDropdown = document.getElementById('filterDropdown');
const filterCourse = document.getElementById('filterCourse');
const filterGender = document.getElementById('filterGender');
const filterSession = document.getElementById('filterSession');
const applyFilters = document.getElementById('applyFilters');
const clearFilters = document.getElementById('clearFilters');

// State
let allStudents = [];
let currentStudent = null;
let filteredStudents = [];
let currentFilters = {
    course: '',
    gender: '',
    session: ''
};
// Keyboard navigation state
let selectedIndex = -1; // -1 means no selection

// Fetch all students
async function fetchStudents() {
    try {
        loadingElement.classList.remove('hidden');
        emptyStateElement.classList.add('hidden');
        
        const response = await fetch(`${API_BASE}/students`);
        if (response.ok) {
            const students = await response.json();
            allStudents = students;
            filteredStudents = [...allStudents];
            renderStudents(filteredStudents);
            populateSessionFilter(); // Populate session filter with unique sessions
        } else {
            throw new Error('Failed to fetch students');
        }
    } catch (error) {
        console.error('Error fetching students:', error);
        showError('Failed to load students');
    } finally {
        loadingElement.classList.add('hidden');
    }
}

// Populate session filter with unique sessions
function populateSessionFilter() {
    // Clear existing options except the first one
    while (filterSession.options.length > 1) {
        filterSession.remove(1);
    }
    
    // Get unique sessions from students
    const sessions = [...new Set(allStudents.map(student => student.session).filter(session => session))];
    
    // Add sessions to filter dropdown
    sessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session;
        option.textContent = session;
        filterSession.appendChild(option);
    });
}

// Apply filters to students
function applyStudentFilters() {
    filteredStudents = allStudents.filter(student => {
        // Course filter
        if (currentFilters.course && student.course !== currentFilters.course) {
            return false;
        }
        
        // Gender filter
        if (currentFilters.gender && student.gender !== currentFilters.gender) {
            return false;
        }
        
        // Session filter
        if (currentFilters.session && student.session !== currentFilters.session) {
            return false;
        }
        
        return true;
    });
    
    renderStudents(filteredStudents);
}

// Render students in the list
function renderStudents(students) {
    studentsContainer.innerHTML = '';
    
    if (students.length === 0) {
        emptyStateElement.classList.remove('hidden');
        return;
    }
    
    emptyStateElement.classList.add('hidden');
    
    students.forEach((student, index) => {
        const studentItem = document.createElement('div');
        studentItem.className = `student-item grid grid-cols-12 py-4 px-6 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}`;
        // make focusable for keyboard navigation
        studentItem.tabIndex = 0;
        studentItem.dataset.index = index;
        const genderIcon = student.gender === 'Male' ? '♂️' : 
                           student.gender === 'Female' ? '♀️' : '⚲';

        studentItem.innerHTML = `
            <div class="col-span-1 flex items-center">
                <span class="text-lg" title="${student.gender || 'Not specified'}">${genderIcon}</span>
            </div>
            <div class="col-span-4 flex items-center font-medium">${student.name}</div>
            <div class="col-span-3 flex items-center text-gray-400">${student.course}</div>
            <div class="col-span-2 flex items-center">${student.student_id || 'N/A'}</div>
            <div class="col-span-2 flex items-center text-sm truncate">${student.session || 'N/A'}</div>
        `;
        
        studentItem.addEventListener('click', () => {
            setSelectedIndex(index);
            showStudentDetails(student);
        });
        studentItem.addEventListener('focus', () => setSelectedIndex(index));
        studentItem.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                showStudentDetails(student);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveSelection(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveSelection(-1);
            }
        });
        studentsContainer.appendChild(studentItem);
    });

    // Adjust selection if out of bounds
    const count = students.length;
    if (selectedIndex >= count) selectedIndex = count - 1;
    updateSelectionVisual();
}

// Helper: get visible student item elements
function getStudentItems() {
    return Array.from(studentsContainer.querySelectorAll('.student-item'));
}

function setSelectedIndex(index) {
    const items = getStudentItems();
    if (items.length === 0) {
        selectedIndex = -1;
        return;
    }
    selectedIndex = Math.max(-1, Math.min(index, items.length - 1));
    updateSelectionVisual();
}

function updateSelectionVisual() {
    const items = getStudentItems();
    items.forEach((el, i) => {
        if (i === selectedIndex) {
            el.classList.add('student-selected');
            el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            try { el.focus(); } catch (e) {}
        } else {
            el.classList.remove('student-selected');
        }
    });
}

function moveSelection(delta) {
    const items = getStudentItems();
    if (items.length === 0) return;
    if (selectedIndex === -1) {
        setSelectedIndex(delta > 0 ? 0 : items.length - 1);
    } else {
        setSelectedIndex(selectedIndex + delta);
    }
}

function openSelected() {
    const items = getStudentItems();
    if (selectedIndex >= 0 && selectedIndex < items.length) {
        const idx = selectedIndex;
        const student = filteredStudents[idx];
        if (student) showStudentDetails(student);
    }
}

// Show student details in modal
function showStudentDetails(student) {
    currentStudent = student;
    
    studentDetails.innerHTML = `
        <div class="flex flex-col items-center mb-6">
            ${student.profile_pic_url ? 
                `<img src="${student.profile_pic_url}" alt="${student.name}" class="profile-image rounded-lg mb-4">` : 
                `<i class="fa-solid fa-id-badge id-badge-icon" style="font-size: 5rem;"></i>`
            }
            <h3 class="text-2xl font-semibold mt-2">${student.name}</h3>
            <p class="text-blue-400">${student.course}</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-gray-400 text-sm mb-1">Student ID</h4>
                <p>${student.student_id || 'N/A'}</p>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-gray-400 text-sm mb-1">Session</h4>
                <p>${student.session || 'N/A'}</p>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-gray-400 text-sm mb-1">Email</h4>
                <p>${student.email}</p>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-gray-400 text-sm mb-1">Phone</h4>
                <p>${student.phone}</p>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-gray-400 text-sm mb-1">Father's Name</h4>
                <p>${student.father_name || 'N/A'}</p>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-gray-400 text-sm mb-1">Secondary Phone</h4>
                <p>${student.phone2 || 'N/A'}</p>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-gray-400 text-sm mb-1">Date of Birth</h4>
                <p>${student.dob || 'N/A'}</p>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-gray-400 text-sm mb-1">Emergency Contact</h4>
                <p>${student.emergency_contact || 'N/A'}</p>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg">
                <h4 class="text-gray-400 text-sm mb-1">Gender</h4>
                <p>${student.gender || 'N/A'}</p>
            </div>
        </div>
        
        <div class="mt-6 bg-gray-700 p-4 rounded-lg">
            <h4 class="text-gray-400 text-sm mb-1">Address</h4>
            <p>${student.address || 'N/A'}</p>
        </div>
        
        <div class="mt-6 flex justify-end space-x-3">
            <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg edit-student">
                Edit
            </button>
            <button class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg delete-student">
                Delete
            </button>
            <button class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg" id="closeModalBtn">
                Close
            </button>
        </div>
    `;
    
    document.querySelector('.edit-student').addEventListener('click', () => {
        showEditForm(student);
    });
    
    document.querySelector('.delete-student').addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete ${student.name}?`)) {
            deleteStudent(student.id);
        }
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', hideModal);
    
    studentModal.classList.remove('hidden');
}

// Show edit form - FIXED PROFILE PICTURE DUPLICATION BUG
function showEditForm(student) {
    // Clear any existing profile picture section first
    const existingProfilePic = document.querySelector('.profile-pic-section');
    if (existingProfilePic) {
        existingProfilePic.remove();
    }
    
    // Create profile picture section
    const profilePicSection = `
        <!-- Profile Picture -->
        <div class="profile-pic-section flex flex-col items-center">
            <label class="block text-gray-300 font-medium mb-3">Profile Picture</label>
            <div class="photo-upload relative w-32 h-40 border-2 border-dashed border-gray-500 rounded-lg flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition cursor-pointer overflow-hidden">
                <input type="file" accept="image/*" id="editProfilePic" onchange="previewEditImage(event)">
                <label for="editProfilePic" class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 hover:text-white" id="editUploadLabel">
                    ${student.profile_pic_url ? 
                        `<img src="${student.profile_pic_url}" alt="${student.name}" class="w-full h-full object-cover rounded-lg">` :
                        `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h2l2-3h10l2 3h2v13H3V7z" />
                            <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2" fill="none" />
                        </svg>
                        <span class="text-sm">Change</span>`
                    }
                </label>
                <img id="editPreview" class="hidden w-full h-full object-cover rounded-lg">
            </div>
        </div>
    `;
    
    // Insert the profile picture section at the beginning of the form
    editForm.insertAdjacentHTML('afterbegin', profilePicSection);
    
    // Populate form fields
    document.getElementById('editId').value = student.id;
    document.getElementById('editStudentId').value = student.student_id || '';
    document.getElementById('editName').value = student.name;
    document.getElementById('editFatherName').value = student.father_name || '';
    document.getElementById('editEmail').value = student.email;
    document.getElementById('editPhone').value = student.phone;
    document.getElementById('editPhone2').value = student.phone2 || '';
    document.getElementById('editEmergencyContact').value = student.emergency_contact || '';
    document.getElementById('editDob').value = student.dob || '';
    document.getElementById('editAddress').value = student.address || '';
    document.getElementById('editGender').value = student.gender || '';
    document.getElementById('editCourse').value = student.course || '';
    document.getElementById('editSession').value = student.session || '';
    
    // Show the edit modal
    editModal.classList.remove('hidden');
    studentModal.classList.add('hidden');
}

// Image preview for edit form
function previewEditImage(event) {
    const input = event.target;
    const preview = document.getElementById('editPreview');
    const label = document.getElementById('editUploadLabel');

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            label.classList.add('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Show add form
function showAddForm() {
    addForm.innerHTML = `
        <!-- Profile Picture -->
        <div class="flex flex-col items-center">
            <label class="block text-gray-300 font-medium mb-3">Profile Picture</label>
            <div class="photo-upload relative w-32 h-40 border-2 border-dashed border-gray-500 rounded-lg flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition cursor-pointer overflow-hidden">
                <input type="file" accept="image/*" id="addProfilePic" onchange="previewAddImage(event)">
                <label for="addProfilePic" class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 hover:text-white" id="addUploadLabel">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h2l2-3h10l2 3h2v13H3V7z" />
                        <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2" fill="none" />
                    </svg>
                    <span class="text-sm">Upload</span>
                </label>
                <img id="addPreview" class="hidden w-full h-full object-cover rounded-lg">
            </div>
        </div>

        <!-- Student ID -->
        <div>
            <label class="block text-gray-300 font-medium mb-1">Student ID</label>
            <input type="text" name="student_id" placeholder="Unique student ID" required
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-400">
        </div>
        
        <!-- Name -->
        <div>
            <label class="block text-gray-300 font-medium mb-1">Name</label>
            <input type="text" name="name" placeholder="Enter full name" required
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-400">
        </div>

        <!-- Father's Name -->
        <div>
            <label class="block text-gray-300 font-medium mb-1">Father's Name</label>
            <input type="text" name="father_name" placeholder="Enter father's name"
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-400">
        </div>

        <!-- Email -->
        <div>
            <label class="block text-gray-300 font-medium mb-1">Email</label>
            <input type="email" name="email" placeholder="Enter email" required
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-400">
        </div>

        <!-- Phone Numbers -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-gray-300 font-medium mb-1">Phone</label>
                <input type="tel" name="phone" placeholder="Primary phone" required
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-400">
            </div>
            <div>
                <label class="block text-gray-300 font-medium mb-1">Phone 2</label>
                <input type="tel' name="phone2" placeholder="Secondary phone"
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-400">
            </div>
        </div>

        <!-- Emergency Contact -->
        <div>
            <label class="block text-gray-300 font-medium mb-1">Emergency Contact</label>
            <input type="tel" name="emergency_contact" placeholder="Emergency contact number"
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-400">
        </div>

        <!-- DOB -->
        <div>
            <label class="block text-gray-300 font-medium mb-1">Date of Birth</label>
            <input type="date" name="dob" required
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-400">
        </div>

        <!-- Address -->
        <div>
            <label class="block text-gray-300 font-medium mb-1">Address</label>
            <textarea name="address" placeholder="Enter address" rows="3"
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-400"></textarea>
        </div>

        <!-- Gender -->
        <div>
            <label class="block text-gray-300 font-medium mb-1">Gender</label>
            <select name="gender" required
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-400">
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
            </select>
        </div>

        <!-- Course -->
        <div>
            <label class="block text-gray-300 font-medium mb-1">Course</label>
            <select name="course" required
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-400">
                <option value="">Select a course</option>
                <!-- Add more courses here by duplicating the option line below -->
                <option value="science">Science</option>
                <option value="commerce">Commerce</option>
                <option value="arts">Arts</option>
                <option value="it">Information Technology</option>
                <!-- Add more courses above this line -->
            </select>
        </div>

        <!-- Session -->
        <div>
            <label class="block text-gray-300 font-medium mb-1">Session</label>
            <input type="text" name="session" placeholder="Enter session (e.g., 2023-2024)"
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-400">
        </div>

        <div class="flex justify-end space-x-3 pt-4">
            <button type="button" id="cancelAdd" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg">
                Cancel
            </button>
            <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                Add Student
            </button>
        </div>
    `;
    
    document.getElementById('cancelAdd').addEventListener('click', hideModal);
    document.getElementById('addForm').addEventListener('submit', handleAddSubmit);
    
    addModal.classList.remove('hidden');
}

// Handle add form submission
async function handleAddSubmit(e) {
    e.preventDefault();
    
    const formElement = e.target;
    const formData = new FormData(formElement);

    const fileInput = document.getElementById("addProfilePic");
    if (fileInput && fileInput.files.length > 0) {
        formData.append("profile_pic", fileInput.files[0]);
    }

    try {
        const res = await fetch(`${API_BASE}/submit`, {
            method: "POST",
            body: formData,
        });

        if (!res.ok) throw new Error("Failed to submit form");

        await res.json();

        alert("Student added successfully!");
        formElement.reset();

        const preview = document.getElementById("addPreview");
        const label = document.getElementById("addUploadLabel");
        if (preview) {
            preview.src = "";
            preview.classList.add("hidden");
        }
        if (label) {
            label.classList.remove("hidden");
        }

        hideModal();
        fetchStudents();

    } catch (err) {
        console.error(err);
        alert("Error submitting the form.");
    }
}

// Image preview for add form
function previewAddImage(event) {
    const input = event.target;
    const preview = document.getElementById('addPreview');
    const label = document.getElementById('addUploadLabel');

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            label.classList.add('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Hide modal
function hideModal() {
    studentModal.classList.add('hidden');
    editModal.classList.add('hidden');
    addModal.classList.add('hidden');
    
    // Clean up any dynamically added profile picture elements
    const existingProfilePic = document.querySelector('.profile-pic-section');
    if (existingProfilePic) {
        existingProfilePic.remove();
    }
}

// Delete a student
async function deleteStudent(studentId) {
    try {
        const response = await fetch(`${API_BASE}/students/${studentId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            allStudents = allStudents.filter(s => s.id !== studentId);
            filteredStudents = filteredStudents.filter(s => s.id !== studentId);
            renderStudents(filteredStudents);
            hideModal();
            showSuccess('Student deleted successfully');
        } else {
            throw new Error('Failed to delete student');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showError('Failed to delete student');
    }
}

// Update a student
async function updateStudent(studentData) {
    try {
        const response = await fetch(`${API_BASE}/students/${studentData.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(studentData)
        });
        
        if (response.ok) {
            fetchStudents();
            hideModal();
            showSuccess('Student updated successfully');
        } else {
            throw new Error('Failed to update student');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        showError('Failed to update student');
    }
}

// // Enhanced fuzzy search implementation ----- This is fuzzy search if you enable this dissable the one bellow.
// function normalizeText(text) {
//     if (!text) return '';
//     return text.toString()
//         .toLowerCase()
//         .trim()
//         .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
//         .replace(/\s+/g, ' '); // Normalize whitespace
// }

// function advancedSearch(term, text) {
//     if (!term) return true;
//     if (!text) return false;
    
//     const normalizedTerm = normalizeText(term);
//     const normalizedText = normalizeText(text);
    
//     if (normalizedTerm.length === 0) return true;
//     if (normalizedText.length === 0) return false;
    
//     // Exact match (highest priority)
//     if (normalizedText === normalizedTerm) return true;
    
//     // Starts with term
//     if (normalizedText.startsWith(normalizedTerm)) return true;
    
//     // Contains term as whole word
//     if (new RegExp(`\\b${normalizedTerm}\\b`).test(normalizedText)) return true;
    
//     // Contains term anywhere
//     if (normalizedText.includes(normalizedTerm)) return true;
    
//     // Fuzzy matching for longer terms
//     if (normalizedTerm.length > 2) {
//         // Calculate Levenshtein distance for similarity
//         const distance = levenshteinDistance(normalizedTerm, normalizedText);
//         const maxLength = Math.max(normalizedTerm.length, normalizedText.length);
//         const similarity = 1 - (distance / maxLength);
        
//         // If similarity is above threshold, consider it a match
//         if (similarity > 0.7) return true;
        
//         // Check if term is contained with minor errors
//         if (containsWithTypos(normalizedTerm, normalizedText)) return true;
//     }
    
//     return false;
// }

// // Levenshtein distance algorithm for similarity measurement
// function levenshteinDistance(a, b) {
//     const matrix = [];
    
//     for (let i = 0; i <= b.length; i++) {
//         matrix[i] = [i];
//     }
    
//     for (let j = 0; j <= a.length; j++) {
//         matrix[0][j] = j;
//     }
    
//     for (let i = 1; i <= b.length; i++) {
//         for (let j = 1; j <= a.length; j++) {
//             if (b.charAt(i - 1) === a.charAt(j - 1)) {
//                 matrix[i][j] = matrix[i - 1][j - 1];
//             } else {
//                 matrix[i][j] = Math.min(
//                     matrix[i - 1][j - 1] + 1, // substitution
//                     matrix[i][j - 1] + 1,     // insertion
//                     matrix[i - 1][j] + 1      // deletion
//                 );
//             }
//         }
//     }
    
//     return matrix[b.length][a.length];
// }

// // Check if text contains term with possible typos
// function containsWithTypos(term, text) {
//     if (text.length < term.length) return false;
    
//     for (let i = 0; i <= text.length - term.length; i++) {
//         const substring = text.substring(i, i + term.length);
//         const distance = levenshteinDistance(term, substring);
        
//         if (distance <= Math.ceil(term.length * 0.3)) { // Allow 30% errors
//             return true;
//         }
//     }
    
//     return false;
// }

// // Weighted search - some fields are more important than others
// const searchWeights = {
//     name: 3,
//     student_id: 2,
//     email: 2,
//     course: 1.5,
//     session: 1.5,
//     phone: 1,
//     phone2: 1,
//     father_name: 1,
//     gender: 1,
//     address: 0.5
// };

// // Search functionality with scoring
// function filterStudents(searchTerm) {
//     if (!searchTerm || searchTerm.trim() === '') {
//         renderStudents(filteredStudents);
//         return;
//     }
    
//     const normalizedSearchTerm = normalizeText(searchTerm);
    
//     // Score each student based on search relevance
//     const scoredStudents = filteredStudents.map(student => {
//         let score = 0;
//         let matchedFields = [];
        
//         // Check each field with appropriate weight
//         for (const [field, weight] of Object.entries(searchWeights)) {
//             if (student[field] && advancedSearch(normalizedSearchTerm, student[field])) {
//                 score += weight;
//                 matchedFields.push(field);
//             }
//         }
        
//         return { student, score, matchedFields };
//     });
    
//     // Filter out non-matching students and sort by relevance
//     const searchFiltered = scoredStudents
//         .filter(item => item.score > 0)
//         .sort((a, b) => b.score - a.score)
//         .map(item => item.student);
    
//     renderStudents(searchFiltered);
// }

// // Improved global keyboard handler with better search integration
// // Improved global keyboard handler with better search integration
// document.addEventListener('keydown', (e) => {
//     const active = document.activeElement;
//     const activeTag = active && active.tagName ? active.tagName.toLowerCase() : '';
//     const isModalOpen = !studentModal.classList.contains('hidden') || 
//                        !editModal.classList.contains('hidden') || 
//                        !addModal.classList.contains('hidden');
//     const isSearchFocused = active === searchInput;

//     if (e.key === 'Escape') {
//         if (isSearchFocused) {
//             searchInput.value = '';
//             filterStudents('');
//             searchInput.blur();
//         } else if (isModalOpen) {
//             hideModal();
//         } else if (filterDropdown.classList.contains('block')) {
//             filterDropdown.classList.remove('block');
//             filterDropdown.classList.add('hidden');
//         }
//         e.preventDefault();
//         return;
//     }

//     // Don't interfere if user is typing in any input, textarea, or select
//     if (['input', 'textarea', 'select'].includes(activeTag)) {
//         // Allow normal typing in search input
//         if (isSearchFocused) {
//             // Let the browser handle input normally
//             // Search will be handled by the input event listener
//             return;
//         }
//         return;
//     }

//     // Don't interfere if a modal is open (except for Escape key)
//     if (isModalOpen) {
//         return;
//     }

//     // Quick search shortcuts
//     if (e.key === '/' && !isSearchFocused) {
//         e.preventDefault();
//         searchInput.focus();
//         searchInput.select();
//         return;
//     }

//     if (e.key === 'ArrowDown') {
//         e.preventDefault();
//         moveSelection(1);
//         return;
//     }
    
//     if (e.key === 'ArrowUp') {
//         e.preventDefault();
//         moveSelection(-1);
//         return;
//     }
    
//     if (e.key === 'Enter') {
//         e.preventDefault();
//         openSelected();
//         return;
//     }

//     // Focus search when typing anywhere (except in form fields and modals)
//     const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
//     if (isPrintable && !isSearchFocused) {
//         searchInput.focus();
//         searchInput.value = e.key;
//         filterStudents(searchInput.value);
//         // Don't prevent default - let the browser handle the keypress normally
//         return;
//     }
    
//     // Handle backspace when search is not focused
//     if (e.key === 'Backspace' && !isSearchFocused) {
//         searchInput.focus();
//         searchInput.value = '';
//         filterStudents('');
//         e.preventDefault();
//     }
// });


// Advanced search implementation
function normalizeSearchText(text) {
    if (!text) return '';
    return text.toString()
        .toLowerCase()
        .trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[^\w\s]/gi, ''); // Remove special characters
}

function advancedSearch(term, text) {
    if (!term || !text) return false;
    
    const normalizedTerm = normalizeSearchText(term);
    const normalizedText = normalizeSearchText(text);
    
    if (normalizedTerm.length === 0) return false;
    
    // Exact match (highest priority)
    if (normalizedText === normalizedTerm) return true;
    
    // Starts with term
    if (normalizedText.startsWith(normalizedTerm)) return true;
    
    // Contains term as whole word
    const words = normalizedText.split(/\s+/);
    if (words.some(word => word === normalizedTerm)) return true;
    
    // Contains term anywhere
    if (normalizedText.includes(normalizedTerm)) return true;
    
    // For very short terms, check if they're part of any word
    if (normalizedTerm.length <= 2) {
        if (words.some(word => word.startsWith(normalizedTerm))) return true;
    }
    
    return false;
}

// Field-specific search weights
const searchWeights = {
    name: 4,
    student_id: 3,
    email: 3,
    course: 2,
    session: 2,
    phone: 2,
    phone2: 1,
    father_name: 2,
    gender: 2,
    address: 1
};

// Search functionality with scoring
function filterStudents(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        renderStudents(filteredStudents);
        return;
    }
    
    const searchResults = filteredStudents.map(student => {
        let score = 0;
        let matchedFields = [];
        
        // Check each field with appropriate weight
        for (const [field, weight] of Object.entries(searchWeights)) {
            if (student[field] && advancedSearch(searchTerm, student[field])) {
                score += weight;
                matchedFields.push(field);
            }
        }
        
        return { student, score, matchedFields };
    });
    
    // Filter out non-matching students and sort by relevance
    const searchFiltered = searchResults
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.student);
    
    renderStudents(searchFiltered);
}

// Simple and effective keyboard handler
document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const activeTag = active && active.tagName ? active.tagName.toLowerCase() : '';
    const isModalOpen = !studentModal.classList.contains('hidden') || 
                       !editModal.classList.contains('hidden') || 
                       !addModal.classList.contains('hidden');
    const isSearchFocused = active === searchInput;

    // Don't interfere if user is typing in any input, textarea, or select
    if (['input', 'textarea', 'select'].includes(activeTag)) {
        return;
    }

    // Don't interfere if a modal is open
    if (isModalOpen) {
        if (e.key === 'Escape') {
            hideModal();
            e.preventDefault();
        }
        return;
    }

    // Global shortcuts
    switch (e.key) {
        case 'Escape':
            if (filterDropdown.classList.contains('block')) {
                filterDropdown.classList.remove('block');
                filterDropdown.classList.add('hidden');
                e.preventDefault();
            }
            break;
            
        case '/':
            if (!isSearchFocused) {
                searchInput.focus();
                searchInput.select();
                e.preventDefault();
            }
            break;
            
        case 'ArrowDown':
            moveSelection(1);
            e.preventDefault();
            break;
            
        case 'ArrowUp':
            moveSelection(-1);
            e.preventDefault();
            break;
            
        case 'Enter':
            openSelected();
            e.preventDefault();
            break;
            
        case 'Backspace':
            if (!isSearchFocused) {
                searchInput.focus();
                searchInput.value = '';
                filterStudents('');
                e.preventDefault();
            }
            break;
            
        default:
            // Focus search when typing regular characters
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isSearchFocused) {
                searchInput.focus();
                searchInput.value = e.key;
                filterStudents(searchInput.value);
            }
            break;
    }
});



// Show error message
function showError(message) {
    alert(`Error: ${message}`);
}

// Show success message
function showSuccess(message) {
    alert(`Success: ${message}`);
}

// Event Listeners
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    filterStudents(searchTerm);
});

addStudentBtn.addEventListener('click', showAddForm);
addFirstStudent.addEventListener('click', showAddForm);

closeModal.addEventListener('click', hideModal);
closeEditModal.addEventListener('click', hideModal);
closeAddModal.addEventListener('click', hideModal);
cancelEdit.addEventListener('click', hideModal);

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const studentData = {
        id: document.getElementById('editId').value,
        student_id: document.getElementById('editStudentId').value,
        name: document.getElementById('editName').value,
        father_name: document.getElementById('editFatherName').value,
        email: document.getElementById('editEmail').value,
        phone: document.getElementById('editPhone').value,
        phone2: document.getElementById('editPhone2').value,
        emergency_contact: document.getElementById('editEmergencyContact').value,
        dob: document.getElementById('editDob').value,
        address: document.getElementById('editAddress').value,
        gender: document.getElementById('editGender').value,
        course: document.getElementById('editCourse').value,
        session: document.getElementById('editSession').value
    };
    
    updateStudent(studentData);
});

// Filter functionality
filterBtn.addEventListener('click', () => {
    filterDropdown.classList.toggle('hidden');
    filterDropdown.classList.toggle('block');
});

applyFilters.addEventListener('click', () => {
    currentFilters = {
        course: filterCourse.value,
        gender: filterGender.value,
        session: filterSession.value
    };
    
    applyStudentFilters();
    filterDropdown.classList.add('hidden');
});

clearFilters.addEventListener('click', () => {
    filterCourse.value = '';
    filterGender.value = '';
    filterSession.value = '';
    currentFilters = {
        course: '',
        gender: '',
        session: ''
    };
    
    filteredStudents = [...allStudents];
    renderStudents(filteredStudents);
    filterDropdown.classList.add('hidden');
});

// Close filter dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
        filterDropdown.classList.add('hidden');
        filterDropdown.classList.remove('block');
    }
});

// Close modal when clicking outside
studentModal.addEventListener('click', (e) => {
    if (e.target === studentModal) hideModal();
});
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) hideModal();
});
addModal.addEventListener('click', (e) => {
    if (e.target === addModal) hideModal();
});

// Initialize
document.addEventListener('DOMContentLoaded', fetchStudents);
