// Bug management functions
function loadBugPage() {
    const pageContent = document.getElementById('pageContent');
    const pageTitle = document.getElementById('pageTitle');
    
    if (pageTitle) pageTitle.textContent = 'Bug WhatsApp';
    
    if (pageContent) {
        pageContent.innerHTML = `
            <div class="bug-container">
                <div class="page-header">
                    <div class="header-left">
                        <h2>Bug WhatsApp Management</h2>
                        <p>Create and manage WhatsApp bug attacks</p>
                    </div>
                    <div class="header-right">
                        <button class="btn-primary" onclick="showCreateBugModal()">
                            <i class="fas fa-plus"></i>
                            Create New Bug
                        </button>
                    </div>
                </div>
                
                <div class="bug-stats">
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-bug"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="totalBugAttacks">0</h3>
                            <p>Total Attacks</p>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-play"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="activeBugAttacks">0</h3>
                            <p>Active Attacks</p>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-check"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="successfulAttacks">0</h3>
                            <p>Successful</p>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-times"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="failedAttacks">0</h3>
                            <p>Failed</p>
                        </div>
                    </div>
                </div>
                
                <div class="bug-controls">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="bugSearch" placeholder="Search bugs..." onkeyup="filterBugs()">
                    </div>
                    <div class="filter-controls">
                        <select id="statusFilter" onchange="filterBugs()">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="stopped">Stopped</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                        </select>
                        <select id="typeFilter" onchange="filterBugs()">
                            <option value="">All Types</option>
                            <option value="crash">Crash Bug</option>
                            <option value="freeze">Freeze Bug</option>
                            <option value="spam">Spam Bug</option>
                            <option value="custom">Custom Bug</option>
                        </select>
                    </div>
                </div>
                
                <div class="bug-list-container">
                    <div class="bug-list" id="bugList">
                        <div class="loading-placeholder">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading bugs...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load bug data
        loadBugData();
    }
}

async function loadBugData() {
    try {
        const response = await fetch('/api/bug/list', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateBugStats(data.stats);
            displayBugList(data.bugs);
        } else {
            showToast('Failed to load bug data', 'error');
        }
    } catch (error) {
        console.error('Error loading bug data:', error);
        showToast('Network error while loading bugs', 'error');
    }
}

function updateBugStats(stats) {
    const totalBugAttacks = document.getElementById('totalBugAttacks');
    const activeBugAttacks = document.getElementById('activeBugAttacks');
    const successfulAttacks = document.getElementById('successfulAttacks');
    const failedAttacks = document.getElementById('failedAttacks');
    
    if (totalBugAttacks) totalBugAttacks.textContent = stats?.total || 0;
    if (activeBugAttacks) activeBugAttacks.textContent = stats?.active || 0;
    if (successfulAttacks) successfulAttacks.textContent = stats?.successful || 0;
    if (failedAttacks) failedAttacks.textContent = stats?.failed || 0;
}

function displayBugList(bugs) {
    const bugList = document.getElementById('bugList');
    if (!bugList) return;
    
    if (!bugs || bugs.length === 0) {
        bugList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bug"></i>
                <h3>No Bugs Found</h3>
                <p>Create your first bug attack to get started</p>
                <button class="btn-primary" onclick="showCreateBugModal()">
                    <i class="fas fa-plus"></i>
                    Create Bug
                </button>
            </div>
        `;
        return;
    }
    
    bugList.innerHTML = bugs.map(bug => `
        <div class="bug-item" data-id="${bug.id}">
            <div class="bug-header">
                <div class="bug-info">
                    <h3>${bug.name}</h3>
                    <p>${bug.description}</p>
                </div>
                <div class="bug-status">
                    <span class="status-badge ${bug.status}">${bug.status}</span>
                </div>
            </div>
            
            <div class="bug-details">
                <div class="detail-item">
                    <span class="label">Type:</span>
                    <span class="value">${bug.type}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Target:</span>
                    <span class="value">${bug.target}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Created:</span>
                    <span class="value">${formatDate(bug.createdAt)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Progress:</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${bug.progress || 0}%"></div>
                    </div>
                    <span class="value">${bug.progress || 0}%</span>
                </div>
            </div>
            
            <div class="bug-actions">
                ${bug.status === 'active' ? 
                    `<button class="btn-danger" onclick="stopBug('${bug.id}')">
                        <i class="fas fa-stop"></i>
                        Stop
                    </button>` :
                    `<button class="btn-success" onclick="startBug('${bug.id}')">
                        <i class="fas fa-play"></i>
                        Start
                    </button>`
                }
                <button class="btn-secondary" onclick="viewBugDetails('${bug.id}')">
                    <i class="fas fa-eye"></i>
                    Details
                </button>
                <button class="btn-secondary" onclick="editBug('${bug.id}')">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                <button class="btn-danger" onclick="deleteBug('${bug.id}')">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

function showCreateBugModal() {
    const modal = `
        <div class="modal-overlay" id="createBugModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create New Bug Attack</h3>
                    <button class="modal-close" onclick="closeModal('createBugModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="createBugForm" class="modal-form">
                    <div class="form-group">
                        <label for="bugName">Bug Name</label>
                        <input type="text" id="bugName" name="name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="bugDescription">Description</label>
                        <textarea id="bugDescription" name="description" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="bugType">Bug Type</label>
                        <select id="bugType" name="type" required>
                            <option value="">Select Type</option>
                            <option value="crash">Crash Bug</option>
                            <option value="freeze">Freeze Bug</option>
                            <option value="spam">Spam Bug</option>
                            <option value="custom">Custom Bug</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="bugTarget">Target Number</label>
                        <input type="text" id="bugTarget" name="target" placeholder="+1234567890" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="bugMessage">Bug Message</label>
                        <textarea id="bugMessage" name="message" rows="4" placeholder="Enter the bug message content"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="bugCount">Message Count</label>
                        <input type="number" id="bugCount" name="count" min="1" max="1000" value="10">
                    </div>
                    
                    <div class="form-group">
                        <label for="bugDelay">Delay (seconds)</label>
                        <input type="number" id="bugDelay" name="delay" min="1" max="60" value="1">
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('createBugModal')">
                            Cancel
                        </button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-plus"></i>
                            Create Bug
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modal;
    
    // Add form submit handler
    document.getElementById('createBugForm').addEventListener('submit', handleCreateBug);
}

async function handleCreateBug(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const bugData = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/api/bug/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(bugData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Bug created successfully!', 'success');
            closeModal('createBugModal');
            loadBugData();
        } else {
            showToast(result.message || 'Failed to create bug', 'error');
        }
    } catch (error) {
        console.error('Error creating bug:', error);
        showToast('Network error while creating bug', 'error');
    }
}

async function startBug(bugId) {
    try {
        const response = await fetch(`/api/bug/${bugId}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Bug attack started!', 'success');
            loadBugData();
        } else {
            showToast(result.message || 'Failed to start bug', 'error');
        }
    } catch (error) {
        console.error('Error starting bug:', error);
        showToast('Network error while starting bug', 'error');
    }
}

async function stopBug(bugId) {
    try {
        const response = await fetch(`/api/bug/${bugId}/stop`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Bug attack stopped!', 'info');
            loadBugData();
        } else {
            showToast(result.message || 'Failed to stop bug', 'error');
        }
    } catch (error) {
        console.error('Error stopping bug:', error);
        showToast('Network error while stopping bug', 'error');
    }
}

async function deleteBug(bugId) {
    if (!confirm('Are you sure you want to delete this bug? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/bug/${bugId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Bug deleted successfully!', 'success');
            loadBugData();
        } else {
            showToast(result.message || 'Failed to delete bug', 'error');
        }
    } catch (error) {
        console.error('Error deleting bug:', error);
        showToast('Network error while deleting bug', 'error');
    }
}

function viewBugDetails(bugId) {
    // Implementation for viewing bug details
    showToast('Bug details feature coming soon!', 'info');
}

function editBug(bugId) {
    // Implementation for editing bug
    showToast('Edit bug feature coming soon!', 'info');
}

function filterBugs() {
    const searchTerm = document.getElementById('bugSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    
    const bugItems = document.querySelectorAll('.bug-item');
    
    bugItems.forEach(item => {
        const name = item.querySelector('h3')?.textContent.toLowerCase() || '';
        const description = item.querySelector('p')?.textContent.toLowerCase() || '';
        const status = item.querySelector('.status-badge')?.textContent.toLowerCase() || '';
        const type = item.querySelector('.detail-item .value')?.textContent.toLowerCase() || '';
        
        const matchesSearch = name.includes(searchTerm) || description.includes(searchTerm);
        const matchesStatus = !statusFilter || status === statusFilter;
        const matchesType = !typeFilter || type === typeFilter;
        
        if (matchesSearch && matchesStatus && matchesType) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

