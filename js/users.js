// User management functions
function loadUsersPage() {
    const pageContent = document.getElementById('pageContent');
    const pageTitle = document.getElementById('pageTitle');
    
    if (pageTitle) pageTitle.textContent = 'User Management';
    
    if (pageContent) {
        pageContent.innerHTML = `
            <div class="users-container">
                <div class="page-header">
                    <div class="header-left">
                        <h2>User Management</h2>
                        <p>Manage system users and permissions</p>
                    </div>
                    <div class="header-right">
                        <button class="btn-primary" onclick="showCreateUserModal()">
                            <i class="fas fa-user-plus"></i>
                            Add New User
                        </button>
                    </div>
                </div>
                
                <div class="users-stats">
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="totalUsers">0</h3>
                            <p>Total Users</p>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-user-shield"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="adminUsers">0</h3>
                            <p>Administrators</p>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="activeUsers">0</h3>
                            <p>Active Users</p>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-user-clock"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="onlineUsers">0</h3>
                            <p>Online Now</p>
                        </div>
                    </div>
                </div>
                
                <div class="users-controls">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="userSearch" placeholder="Search users..." onkeyup="filterUsers()">
                    </div>
                    <div class="filter-controls">
                        <select id="roleFilter" onchange="filterUsers()">
                            <option value="">All Roles</option>
                            <option value="admin">Administrator</option>
                            <option value="user">User</option>
                        </select>
                        <select id="statusFilter" onchange="filterUsers()">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="banned">Banned</option>
                        </select>
                    </div>
                </div>
                
                <div class="users-table-container">
                    <table class="users-table" id="usersTable">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Last Login</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            <tr>
                                <td colspan="6" class="loading-cell">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    Loading users...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Load users data
        loadUsersData();
    }
}

async function loadUsersData() {
    try {
        const response = await fetch('/api/users/list', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateUsersStats(data.stats);
            displayUsersTable(data.users);
        } else {
            showToast('Failed to load users data', 'error');
        }
    } catch (error) {
        console.error('Error loading users data:', error);
        showToast('Network error while loading users', 'error');
    }
}

function updateUsersStats(stats) {
    const totalUsers = document.getElementById('totalUsers');
    const adminUsers = document.getElementById('adminUsers');
    const activeUsers = document.getElementById('activeUsers');
    const onlineUsers = document.getElementById('onlineUsers');
    
    if (totalUsers) totalUsers.textContent = stats?.total || 0;
    if (adminUsers) adminUsers.textContent = stats?.admin || 0;
    if (activeUsers) activeUsers.textContent = stats?.active || 0;
    if (onlineUsers) onlineUsers.textContent = stats?.online || 0;
}

function displayUsersTable(users) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    if (!users || users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>No users found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = users.map(user => `
        <tr data-id="${user.id}">
            <td>
                <div class="user-info">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-details">
                        <span class="username">${user.username}</span>
                        <span class="user-id">#${user.id}</span>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="role-badge ${user.role}">${user.role}</span>
            </td>
            <td>
                <span class="status-badge ${user.status}">${user.status}</span>
            </td>
            <td>${user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="viewUser('${user.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="editUser('${user.id}')" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${user.status === 'active' ? 
                        `<button class="btn-icon danger" onclick="banUser('${user.id}')" title="Ban User">
                            <i class="fas fa-ban"></i>
                        </button>` :
                        `<button class="btn-icon success" onclick="unbanUser('${user.id}')" title="Unban User">
                            <i class="fas fa-check"></i>
                        </button>`
                    }
                    <button class="btn-icon danger" onclick="deleteUser('${user.id}')" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showCreateUserModal() {
    const modal = `
        <div class="modal-overlay" id="createUserModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New User</h3>
                    <button class="modal-close" onclick="closeModal('createUserModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="createUserForm" class="modal-form">
                    <div class="form-group">
                        <label for="newUsername">Username</label>
                        <input type="text" id="newUsername" name="username" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="newEmail">Email</label>
                        <input type="email" id="newEmail" name="email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="newPassword">Password</label>
                        <input type="password" id="newPassword" name="password" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="newRole">Role</label>
                        <select id="newRole" name="role" required>
                            <option value="">Select Role</option>
                            <option value="user">User</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="newTelegramId">Telegram ID (Optional)</label>
                        <input type="text" id="newTelegramId" name="telegramId">
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('createUserModal')">
                            Cancel
                        </button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-user-plus"></i>
                            Create User
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modal;
    
    // Add form submit handler
    document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);
}

async function handleCreateUser(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('User created successfully!', 'success');
            closeModal('createUserModal');
            loadUsersData();
        } else {
            showToast(result.message || 'Failed to create user', 'error');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showToast('Network error while creating user', 'error');
    }
}

async function banUser(userId) {
    if (!confirm('Are you sure you want to ban this user?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${userId}/ban`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('User banned successfully!', 'success');
            loadUsersData();
        } else {
            showToast(result.message || 'Failed to ban user', 'error');
        }
    } catch (error) {
        console.error('Error banning user:', error);
        showToast('Network error while banning user', 'error');
    }
}

async function unbanUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/unban`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('User unbanned successfully!', 'success');
            loadUsersData();
        } else {
            showToast(result.message || 'Failed to unban user', 'error');
        }
    } catch (error) {
        console.error('Error unbanning user:', error);
        showToast('Network error while unbanning user', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('User deleted successfully!', 'success');
            loadUsersData();
        } else {
            showToast(result.message || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Network error while deleting user', 'error');
    }
}

function viewUser(userId) {
    // Implementation for viewing user details
    showToast('User details feature coming soon!', 'info');
}

function editUser(userId) {
    // Implementation for editing user
    showToast('Edit user feature coming soon!', 'info');
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('roleFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    const userRows = document.querySelectorAll('#usersTableBody tr[data-id]');
    
    userRows.forEach(row => {
        const username = row.querySelector('.username')?.textContent.toLowerCase() || '';
        const email = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        const role = row.querySelector('.role-badge')?.textContent.toLowerCase() || '';
        const status = row.querySelector('.status-badge')?.textContent.toLowerCase() || '';
        
        const matchesSearch = username.includes(searchTerm) || email.includes(searchTerm);
        const matchesRole = !roleFilter || role === roleFilter;
        const matchesStatus = !statusFilter || status === statusFilter;
        
        if (matchesSearch && matchesRole && matchesStatus) {
            row.style.display = 'table-row';
        } else {
            row.style.display = 'none';
        }
    });
}

