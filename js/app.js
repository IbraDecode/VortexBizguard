// Global variables
let socket;
let currentUser = null;
let currentPage = 'dashboard';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Show loading screen
    showLoadingScreen();
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
        validateToken(token);
    } else {
        showLoginScreen();
    }
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Initialize socket connection
    initializeSocket();
}

function showLoadingScreen() {
    document.getElementById('loadingScreen').classList.remove('hidden');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('mainContainer').classList.add('hidden');
}

function showLoginScreen() {
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('registerScreen').classList.add('hidden');
        document.getElementById('mainContainer').classList.add('hidden');
    }, 1500);
}

function showRegisterScreen() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.remove('hidden');
    document.getElementById('mainContainer').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('mainContainer').classList.remove('hidden');
}

async function validateToken(token) {
    try {
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            initializeMainApp();
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

function initializeMainApp() {
    showMainApp();
    setupUserInterface();
    loadDashboard();
    updateSystemStatus();
}

function setupUserInterface() {
    // Update user info in sidebar
    document.getElementById('sidebarUsername').textContent = currentUser.username;
    document.getElementById('sidebarUserRole').textContent = currentUser.role.toUpperCase();
    
    // Setup sidebar menu based on user role
    setupSidebarMenu();
    
    // Setup page title
    document.getElementById('pageTitle').textContent = 'Dashboard';
}

function setupSidebarMenu() {
    const sidebarMenu = document.getElementById('sidebarMenu');
    const menuItems = [];
    
    // Common menu items for all users
    menuItems.push({
        id: 'dashboard',
        icon: 'fas fa-tachometer-alt',
        text: 'Dashboard',
        page: 'dashboard'
    });
    
    // Premium and Owner can access bug features
    if (['premium', 'owner'].includes(currentUser.role)) {
        menuItems.push({
            id: 'bug',
            icon: 'fas fa-bug',
            text: 'Bug System',
            page: 'bug'
        });
    }
    
    // Owner-only features
    if (currentUser.role === 'owner') {
        menuItems.push({
            id: 'users',
            icon: 'fas fa-users',
            text: 'User Management',
            page: 'users'
        });
        
        menuItems.push({
            id: 'senders',
            icon: 'fas fa-mobile-alt',
            text: 'Sender Management',
            page: 'senders'
        });
        
        menuItems.push({
            id: 'analytics',
            icon: 'fas fa-chart-line',
            text: 'Analytics',
            page: 'analytics'
        });
    }
    
    // Settings for all users
    menuItems.push({
        id: 'settings',
        icon: 'fas fa-cog',
        text: 'Settings',
        page: 'settings'
    });
    
    // Generate menu HTML
    sidebarMenu.innerHTML = menuItems.map(item => `
        <li>
            <a href="#" class="nav-link" data-page="${item.page}">
                <i class="${item.icon}"></i>
                <span>${item.text}</span>
            </a>
        </li>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            navigateToPage(page);
        });
    });
}

function navigateToPage(page) {
    // Update active menu item
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    // Update page title
    const pageTitle = document.querySelector(`[data-page="${page}"] span`).textContent;
    document.getElementById('pageTitle').textContent = pageTitle;
    
    // Load page content
    currentPage = page;
    loadPageContent(page);
}

async function loadPageContent(page) {
    const pageContent = document.getElementById('pageContent');
    
    try {
        switch (page) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'bug':
                await loadBugPage();
                break;
            case 'users':
                await loadUsersPage();
                break;
            case 'senders':
                await loadSendersPage();
                break;
            case 'analytics':
                await loadAnalyticsPage();
                break;
            case 'settings':
                await loadSettingsPage();
                break;
            default:
                pageContent.innerHTML = '<div class="card"><h2>Page not found</h2></div>';
        }
    } catch (error) {
        console.error('Error loading page:', error);
        pageContent.innerHTML = '<div class="card"><h2>Error loading page</h2></div>';
    }
}

function initializeEventListeners() {
    // Login/Register form toggles
    document.getElementById('showRegister')?.addEventListener('click', function(e) {
        e.preventDefault();
        showRegisterScreen();
    });
    
    document.getElementById('showLogin')?.addEventListener('click', function(e) {
        e.preventDefault();
        showLoginScreen();
    });
    
    // Logout buttons
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('logoutLink')?.addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    
    // Mobile menu toggle
    document.getElementById('mobileMenuToggle')?.addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('show');
    });
    
    // User menu dropdown
    document.getElementById('userMenuBtn')?.addEventListener('click', function(e) {
        e.stopPropagation();
        document.getElementById('userDropdown').classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        document.getElementById('userDropdown')?.classList.remove('show');
    });
    
    // Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
}

function initializeSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Connected to server');
        updateSystemStatus('online');
    });
    
    socket.on('disconnect', function() {
        console.log('Disconnected from server');
        updateSystemStatus('offline');
    });
    
    // Bug status updates
    socket.on('bug-status', function(data) {
        updateBugStatus(data);
    });
    
    // Sender status updates
    socket.on('sender-status', function(data) {
        updateSenderStatus(data);
    });
    
    // Pairing code updates
    socket.on('pairing-code', function(data) {
        showPairingCode(data);
    });
    
    // Real-time notifications
    socket.on('notification', function(data) {
        showToast(data.message, data.type || 'info');
    });
}

function updateSystemStatus(status = 'checking') {
    const statusDot = document.getElementById('systemStatus');
    const statusText = document.getElementById('systemStatusText');
    
    if (!statusDot || !statusText) return;
    
    statusDot.className = 'status-dot';
    
    switch (status) {
        case 'online':
            statusDot.classList.add('online');
            statusText.textContent = 'System Online';
            break;
        case 'offline':
            statusDot.classList.add('error');
            statusText.textContent = 'System Offline';
            break;
        case 'warning':
            statusDot.classList.add('warning');
            statusText.textContent = 'System Warning';
            break;
        default:
            statusText.textContent = 'Checking...';
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    
    if (socket) {
        socket.disconnect();
    }
    
    showToast('Logged out successfully', 'success');
    
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// Utility functions
function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    
    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
    
    // Manual close
    toast.querySelector('.toast-close').addEventListener('click', function() {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'fas fa-check-circle';
        case 'error': return 'fas fa-exclamation-circle';
        case 'warning': return 'fas fa-exclamation-triangle';
        case 'info': return 'fas fa-info-circle';
        default: return 'fas fa-info-circle';
    }
}

function showModal(title, content, buttons = []) {
    const modalContainer = document.getElementById('modalContainer');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const buttonsHtml = buttons.map(btn => 
        `<button class="btn ${btn.class || 'btn-secondary'}" onclick="${btn.onclick || ''}">${btn.text}</button>`
    ).join('');
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                ${buttonsHtml}
            </div>
        </div>
    `;
    
    modalContainer.appendChild(modal);
    
    // Show modal
    setTimeout(() => modal.classList.add('show'), 100);
    
    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', function() {
        closeModal(modal);
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
    
    return modal;
}

function closeModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
}

// API helper function
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(endpoint, finalOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Format utilities
function formatDate(dateString) {
    return new Date(dateString).toLocaleString('id-ID');
}

function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Baru saja';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
    return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
}

function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}

// Export for other modules
window.app = {
    showToast,
    showModal,
    closeModal,
    apiRequest,
    formatDate,
    formatTimeAgo,
    formatNumber,
    currentUser: () => currentUser,
    socket: () => socket
};

// Page loading function for external calls
function loadPage(page) {
    navigateToPage(page);
}

// Modal management functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Additional placeholder functions for pages not yet implemented
async function loadAnalyticsPage() {
    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Analytics</h2>
                <p>System analytics and reports</p>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <i class="fas fa-chart-line"></i>
                        <h3>Analytics Coming Soon</h3>
                        <p>Advanced analytics and reporting features will be available soon.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadSettingsPage() {
    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Settings</h2>
                <p>System and user settings</p>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <i class="fas fa-cog"></i>
                        <h3>Settings Coming Soon</h3>
                        <p>Settings panel will be available soon.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Bug status update handler
function updateBugStatus(data) {
    if (currentPage === 'bug') {
        // Refresh bug data if on bug page
        loadBugData();
    }
    
    // Show notification
    showToast(`Bug ${data.name}: ${data.status}`, data.status === 'completed' ? 'success' : 'info');
}

// Sender status update handler
function updateSenderStatus(data) {
    if (currentPage === 'senders') {
        // Refresh senders data if on senders page
        loadSendersData();
    }
    
    // Show notification
    showToast(`Sender ${data.name}: ${data.status}`, data.status === 'connected' ? 'success' : 'warning');
}

// Pairing code handler
function showPairingCode(data) {
    showModal('WhatsApp Pairing Code', `
        <div class="pairing-code-container">
            <h4>Your pairing code:</h4>
            <div class="pairing-code">${data.code}</div>
            <p>Enter this code in WhatsApp to connect your device.</p>
        </div>
    `, [
        { text: 'Close', class: 'btn-secondary', onclick: 'closeModal(this.closest(".modal"))' }
    ]);
}

