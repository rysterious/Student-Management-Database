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

// State
let allStudents = [];
let currentStudent = null;
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
            renderStudents(students);
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
            <div class="col-span-2 flex items-center">${student.phone}</div>
            <div class="col-span-2 flex items-center text-sm truncate">${student.email}</div>
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
        const student = allStudents[idx];
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

// Show edit form
function showEditForm(student) {
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
    
    // Add profile picture section to the edit form
    const profilePicSection = `
        <!-- Profile Picture -->
        <div class="flex flex-col items-center">
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
                <input type="tel" name="phone2" placeholder="Secondary phone"
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
                <option value="science">Science</option>
                <option value="commerce">Commerce</option>
                <option value="arts">Arts</option>
                <option value="it">Information Technology</option>
            </select>
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
    const existingProfilePic = document.getElementById('editProfilePic');
    if (existingProfilePic) {
        existingProfilePic.parentNode.remove();
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
            renderStudents(allStudents);
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
        const formData = new FormData();
        
        // Append all student data to formData
        for (const key in studentData) {
            if (key !== 'profile_pic') {
                formData.append(key, studentData[key]);
            }
        }
        
        // Append profile picture if selected
        const fileInput = document.getElementById("editProfilePic");
        if (fileInput && fileInput.files.length > 0) {
            formData.append("profile_pic", fileInput.files[0]);
        }

        const response = await fetch(`${API_BASE}/students/${studentData.id}`, {
            method: 'PUT',
            body: formData
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

// Search functionality
function filterStudents(searchTerm) {
    if (!searchTerm) {
        renderStudents(allStudents);
        return;
    }
    
    const filtered = allStudents.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.phone && student.phone.includes(searchTerm)) ||
        (student.student_id && student.student_id.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    renderStudents(filtered);
}

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
    filterStudents(e.target.value);
});

addStudentBtn.addEventListener('click', showAddForm);
addFirstStudent.addEventListener('click', showAddForm);

closeModal.addEventListener('click', hideModal);
closeEditModal.addEventListener('click', hideModal);
closeAddModal.addEventListener('click', hideModal);
cancelEdit.addEventListener('click', hideModal);

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(editForm);
    const studentData = {
        id: formData.get('id'),
        student_id: formData.get('student_id'),
        name: formData.get('name'),
        father_name: formData.get('father_name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        phone2: formData.get('phone2'),
        emergency_contact: formData.get('emergency_contact'),
        dob: formData.get('dob'),
        address: formData.get('address'),
        gender: formData.get('gender'),
        course: formData.get('course')
    };
    
    updateStudent(studentData);
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

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const activeTag = active && active.tagName ? active.tagName.toLowerCase() : '';

    if (e.key === 'Escape') {
        hideModal();
        return;
    }

    if (!['input', 'textarea', 'select'].includes(activeTag)) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            moveSelection(1);
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            moveSelection(-1);
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            openSelected();
            return;
        }
    }

    const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (isPrintable && !['input', 'textarea', 'select'].includes(activeTag)) {
        searchInput.focus();
        if (e.key.length === 1) {
            searchInput.value = searchInput.value + e.key;
            filterStudents(searchInput.value);
        }
        e.preventDefault();
    }
});