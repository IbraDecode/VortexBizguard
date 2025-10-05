// Authentication functions
function initializeEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Show register screen
    const showRegisterBtn = document.getElementById('showRegister');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showRegisterScreen();
        });
    }
    
    // Show login screen
    const showLoginBtn = document.getElementById('showLogin');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginScreen();
        });
    }
    
    // Logout buttons
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutLink = document.getElementById('logoutLink');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
    
    // User menu toggle
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', () => {
            userDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showMainContainer();
            showToast('Login successful!', 'success');
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const telegramId = document.getElementById('telegramId').value;
    
    if (!username || !email || !password) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password, telegramId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            showLoginScreen();
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

async function validateToken(token) {
    try {
        const response = await fetch('/api/auth/validate', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showMainContainer();
        } else {
            localStorage.removeItem('token');
            showLoginScreen();
        }
    } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem('token');
        showLoginScreen();
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    
    if (socket) {
        socket.disconnect();
    }
    
    showLoginScreen();
    showToast('Logged out successfully', 'info');
}

function showMainContainer() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('mainContainer').classList.remove('hidden');
    
    // Initialize main app
    initializeMainApp();
}

function initializeMainApp() {
    // Update user info in sidebar
    updateUserInfo();
    
    // Generate sidebar menu
    generateSidebarMenu();
    
    // Load dashboard by default
    loadPage('dashboard');
    
    // Check system status
    checkSystemStatus();
}

function updateUserInfo() {
    if (currentUser) {
        const usernameEl = document.getElementById('sidebarUsername');
        const userRoleEl = document.getElementById('sidebarUserRole');
        
        if (usernameEl) usernameEl.textContent = currentUser.username;
        if (userRoleEl) userRoleEl.textContent = currentUser.role || 'User';
    }
}

function generateSidebarMenu() {
    const menuContainer = document.getElementById('sidebarMenu');
    if (!menuContainer) return;
    
    const menuItems = [
        { id: 'dashboard', icon: 'fas fa-tachometer-alt', text: 'Dashboard', roles: ['admin', 'user'] },
        { id: 'bug', icon: 'fas fa-bug', text: 'Bug WhatsApp', roles: ['admin', 'user'] },
        { id: 'senders', icon: 'fas fa-paper-plane', text: 'Senders', roles: ['admin'] },
        { id: 'users', icon: 'fas fa-users', text: 'Users', roles: ['admin'] }
    ];
    
    const userRole = currentUser?.role || 'user';
    
    menuContainer.innerHTML = menuItems
        .filter(item => item.roles.includes(userRole))
        .map(item => `
            <li>
                <a href="#" class="menu-item" data-page="${item.id}">
                    <i class="${item.icon}"></i>
                    <span>${item.text}</span>
                </a>
            </li>
        `).join('');
    
    // Add event listeners to menu items
    menuContainer.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            loadPage(page);
        });
    });
}

async function checkSystemStatus() {
    try {
        const response = await fetch('/api/system/status', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        const statusDot = document.getElementById('systemStatus');
        const statusText = document.getElementById('systemStatusText');
        
        if (statusDot && statusText) {
            if (data.status === 'online') {
                statusDot.className = 'status-dot online';
                statusText.textContent = 'System Online';
            } else {
                statusDot.className = 'status-dot offline';
                statusText.textContent = 'System Offline';
            }
        }
    } catch (error) {
        console.error('Status check error:', error);
        const statusDot = document.getElementById('systemStatus');
        const statusText = document.getElementById('systemStatusText');
        
        if (statusDot && statusText) {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Status Unknown';
        }
    }
}

