
// Your Firebase Web Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCEtw_2bYuuspxhTynf7mhR0D-ASjg514s",
    authDomain: "portfolio-2-4f08b.firebaseapp.com",
    projectId: "portfolio-2-4f08b",
    storageBucket: "portfolio-2-4f08b.appspot.com",
    messagingSenderId: "540441445471", 
    appId: "1:540441445471:web:a1b2c3d4e5f6g7h8i9j0"                
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('admin-login-form');
const loginStatus = document.getElementById('login-status') || document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// --- 1. PREVENT CACHED PASSWORD ON BACK/FORWARD NAVIGATION ---
window.addEventListener('pageshow', (event) => {
    const passwordInput = document.getElementById('admin-password');
    if (passwordInput) passwordInput.value = '';
    if (loginForm && !auth.currentUser) {
        loginForm.reset();
    }
});

// --- 2. SINGLE CONSOLIDATED LOGIN SUBMIT HANDLER ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('admin-email');
        const passwordInput = document.getElementById('admin-password');
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Security: Clear DOM password value immediately
        passwordInput.value = '';

        // Disable button to prevent spam clicks while authenticating
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';
        }

        try {
            if (loginStatus) {
                loginStatus.innerText = "Authenticating...";
                loginStatus.style.color = "#38bdf8";
            }

            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            
            // Verify admin email
            if (userCredential.user.email !== 'eivanmartelino@gmail.com') {
                await auth.signOut();
                throw new Error("Unauthorized email address");
            }

            loginForm.reset();
            if (loginStatus) loginStatus.innerText = "";
            showToast("Access Granted! Welcome to Admin Panel.", "success");

        } catch (error) {
            if (loginStatus) loginStatus.innerText = "";
            showToast("Restricted Access: Unauthorized attempt. Redirecting to portfolio...", "warning");

            // Re-enable button if login fails so user can retry
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }

            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
        }
    });
}

// --- PASSWORD VISIBILITY TOGGLER ---
const togglePasswordBtn = document.getElementById('toggle-password-btn');
const adminPasswordInput = document.getElementById('admin-password');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');

if (togglePasswordBtn && adminPasswordInput) {
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = adminPasswordInput.type === 'password';

        // Toggle input type between password and readable text
        adminPasswordInput.type = isPassword ? 'text' : 'password';

        // Swap SVG visibility
        if (eyeIcon && eyeOffIcon) {
            eyeIcon.style.display = isPassword ? 'none' : 'block';
            eyeOffIcon.style.display = isPassword ? 'block' : 'none';
        }
    });
}

// --- 3. SINGLE CENTRAL AUTH STATE OBSERVER ---
auth.onAuthStateChanged((user) => {
    if (user && user.email === 'eivanmartelino@gmail.com') {
        // Authorized Admin
        if (loginSection) loginSection.style.display = 'none';
        if (dashboardSection) dashboardSection.style.display = 'block';

        // Safe fetch calls
        fetchAdminMessages();
        fetchAdminProjects();
    } else {
        // Unauthorized or Logged Out
        if (loginSection) loginSection.style.display = 'block';
        if (dashboardSection) dashboardSection.style.display = 'none';

        // If they are an unauthorized user, boot them back out
        if (user && user.email !== 'eivanmartelino@gmail.com') {
            auth.signOut();
            showToast("Restricted Access: Unauthorized account.", "warning");
            setTimeout(() => { window.location.href = "index.html"; }, 1500);
        }
    }
});

// --- 4. LOGOUT HANDLER ---
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        auth.signOut();
        try {
            await auth.signOut();
            showToast("Logged out successfully.", "success");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        } catch (err) {
            showToast("Error logging out", "warning");
        }
    });
}

// --- 5. THEME TOGGLE & SYNC ---
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function applyAdminTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portfolio-theme', theme);
    if (themeIcon) {
        themeIcon.src = theme === 'dark' ? 'assets/Icons/sun.svg' : 'assets/Icons/moon.svg';
    }
}

const currentSavedTheme = localStorage.getItem('portfolio-theme') || 'dark';
applyAdminTheme(currentSavedTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const nextTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        applyAdminTheme(nextTheme);
    });
}

// --- 6. TOAST NOTIFICATION HELPER ---
function showToast(message, type = 'warning') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    let iconFile = 'triangle-alert.svg'; // Default icon

    if (type === 'success') {
        const text = message.toLowerCase();

        if (text.includes('update') || text.includes('edit')) {
            iconFile = 'pencil.svg';
        } else if (text.includes('delete') || text.includes('remove')) {
            iconFile = 'trash-2.svg';
        } else if (text.includes('access') || text.includes('welcome') || text.includes('login')) {
            iconFile = 'lock-keyhole-open.svg';
        } else if (text.includes('add') || text.includes('publish') || text.includes('create')) {
            iconFile = 'rocket.svg';
        } else {
            iconFile = 'lock-keyhole-open.svg';
        }
    } else if (type === 'warning' || type === 'error') {
        iconFile = 'triangle-alert.svg';
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <img src="assets/icons/${iconFile}" alt="" class="toast-svg">
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- 7. FETCH & DELETE MESSAGES ---
async function fetchAdminMessages() {
    const inbox = document.getElementById('messages-inbox');
    if (!inbox) return;

    try {
        const response = await fetch(`${API_BASE_URL}/messages`);
        const messages = await response.json();

        inbox.innerHTML = '';
        if (messages.length === 0) {
            inbox.innerHTML = '<p style="color: #94a3b8;">No incoming messages found.</p>';
            return;
        }

        messages.forEach(msg => {
            const card = document.createElement('div');
            card.className = 'msg-card';
            card.innerHTML = `
                <div class="msg-meta">From: <span class="msg-sender">${escapeHtml(msg.name)}/span> <span class="msg-email">(${msg.email})</span></div>
                <div class="msg-text">"${escapeHtml(msg.name)}"</div>
                <button class="btn-delete" onclick="deleteMsg('${msg.id}')">Delete Message</button>
            `;
            inbox.appendChild(card);
        });
    } catch (err) {
        inbox.innerHTML = '<p style="color: #f87171;">Failed to load messages from backend.</p>';
    }
}

window.deleteMsg = async (id) => {
    if (!confirm("Delete this message?")) return;
    try {
        await fetch(`${API_BASE_URL}/messages/${id}`, { method: 'DELETE' });
        showToast("Message deleted", "success");
        fetchAdminMessages();
    } catch (err) {
        showToast("Error deleting message", "warning");
    }
};

// --- 8. PROJECTS (FETCH, ADD, EDIT, DELETE) ---
async function fetchAdminProjects() {
    const projectContainer = document.getElementById('admin-projects-list');
    if (!projectContainer) return;

    try {
        const response = await fetch(`${API_BASE_URL}/projects`);
        const projects = await response.json();

        projectContainer.innerHTML = '';
        if (projects.length === 0) {
            projectContainer.innerHTML = '<p style="color: #94a3b8;">No projects found in database.</p>';
            return;
        }

        projects.forEach(proj => {
            const card = document.createElement('div');
            card.className = 'project-card';

            card.innerHTML = `
                <div class="project-card-title">${proj.title}</div>
                <div class="tech-badge"><img src="assets/Icons/zap.svg" alt="" aria-hidden="true" class="svg-icon"> ${proj.tech}</div>
                <div class="project-card-desc">${proj.description}</div>
                <div class="card-actions">
                    <button class="btn-edit" onclick="editProject('${proj.id}', '${escapeHtml(proj.title)}', '${escapeHtml(proj.tech)}', '${escapeHtml(proj.description)}')">Edit Project</button>
                    <button class="btn-delete" onclick="deleteProject('${proj.id}')">Delete Project</button>
                </div>
            `;
            projectContainer.appendChild(card);
        });
    } catch (err) {
        projectContainer.innerHTML = '<p style="color: #f87171;">Failed to load projects.</p>';
    }
}

function escapeHtml(text) {
    return (text || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

window.editProject = async (id, currentTitle, currentTech, currentDesc) => {
    const newTitle = prompt("Edit Project Title:", currentTitle);
    if (newTitle === null) return;

    const newTech = prompt("Edit Tech Stack:", currentTech);
    if (newTech === null) return;

    const newDesc = prompt("Edit Description:", currentDesc);
    if (newDesc === null) return;

    try {
        const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: newTitle,
                tech: newTech,
                description: newDesc
            })
        });

        if (response.ok) {
            showToast("Project updated successfully!", "success");
            fetchAdminProjects();
        } else {
            throw new Error("Failed to update project");
        }
    } catch (err) {
        showToast("Error updating project", "warning");
    }
};

window.deleteProject = async (id) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/projects/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast("Project deleted successfully", "success");
            fetchAdminProjects();
        } else {
            throw new Error("Failed to delete project");
        }
    } catch (err) {
        showToast("Error deleting project", "warning");
    }
};


