// Sender management functions
function loadSendersPage() {
    const pageContent = document.getElementById('pageContent');
    const pageTitle = document.getElementById('pageTitle');
    
    if (pageTitle) pageTitle.textContent = 'Sender Management';
    
    if (pageContent) {
        pageContent.innerHTML = `
            <div class="senders-container">
                <div class="page-header">
                    <div class="header-left">
                        <h2>Sender Management</h2>
                        <p>Manage WhatsApp sender accounts and connections</p>
                    </div>
                    <div class="header-right">
                        <button class="btn-primary" onclick="showAddSenderModal()">
                            <i class="fas fa-plus"></i>
                            Add New Sender
                        </button>
                    </div>
                </div>
                
                <div class="senders-stats">
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-paper-plane"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="totalSenders">0</h3>
                            <p>Total Senders</p>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="connectedSenders">0</h3>
                            <p>Connected</p>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-play"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="activeSenders">0</h3>
                            <p>Active</p>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="errorSenders">0</h3>
                            <p>Errors</p>
                        </div>
                    </div>
                </div>
                
                <div class="senders-controls">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="senderSearch" placeholder="Search senders..." onkeyup="filterSenders()">
                    </div>
                    <div class="filter-controls">
                        <select id="statusFilter" onchange="filterSenders()">
                            <option value="">All Status</option>
                            <option value="connected">Connected</option>
                            <option value="disconnected">Disconnected</option>
                            <option value="error">Error</option>
                            <option value="banned">Banned</option>
                        </select>
                        <button class="btn-secondary" onclick="refreshSenders()">
                            <i class="fas fa-refresh"></i>
                            Refresh
                        </button>
                    </div>
                </div>
                
                <div class="senders-grid" id="sendersGrid">
                    <div class="loading-placeholder">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading senders...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Load senders data
        loadSendersData();
    }
}

async function loadSendersData() {
    try {
        const response = await fetch('/api/senders/list', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateSendersStats(data.stats);
            displaySendersGrid(data.senders);
        } else {
            showToast('Failed to load senders data', 'error');
        }
    } catch (error) {
        console.error('Error loading senders data:', error);
        showToast('Network error while loading senders', 'error');
    }
}

function updateSendersStats(stats) {
    const totalSenders = document.getElementById('totalSenders');
    const connectedSenders = document.getElementById('connectedSenders');
    const activeSenders = document.getElementById('activeSenders');
    const errorSenders = document.getElementById('errorSenders');
    
    if (totalSenders) totalSenders.textContent = stats?.total || 0;
    if (connectedSenders) connectedSenders.textContent = stats?.connected || 0;
    if (activeSenders) activeSenders.textContent = stats?.active || 0;
    if (errorSenders) errorSenders.textContent = stats?.error || 0;
}

function displaySendersGrid(senders) {
    const sendersGrid = document.getElementById('sendersGrid');
    if (!sendersGrid) return;
    
    if (!senders || senders.length === 0) {
        sendersGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-paper-plane"></i>
                <h3>No Senders Found</h3>
                <p>Add your first WhatsApp sender to get started</p>
                <button class="btn-primary" onclick="showAddSenderModal()">
                    <i class="fas fa-plus"></i>
                    Add Sender
                </button>
            </div>
        `;
        return;
    }
    
    sendersGrid.innerHTML = senders.map(sender => `
        <div class="sender-card" data-id="${sender.id}">
            <div class="sender-header">
                <div class="sender-avatar">
                    ${sender.profilePicture ? 
                        `<img src="${sender.profilePicture}" alt="${sender.name}">` :
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="sender-status">
                    <span class="status-dot ${sender.status}"></span>
                </div>
            </div>
            
            <div class="sender-info">
                <h3>${sender.name || 'Unknown'}</h3>
                <p class="sender-number">${sender.number}</p>
                <span class="status-badge ${sender.status}">${sender.status}</span>
            </div>
            
            <div class="sender-stats">
                <div class="stat">
                    <span class="stat-value">${sender.messagesSent || 0}</span>
                    <span class="stat-label">Messages</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${sender.uptime || '0h'}</span>
                    <span class="stat-label">Uptime</span>
                </div>
            </div>
            
            <div class="sender-actions">
                ${sender.status === 'disconnected' ? 
                    `<button class="btn-success" onclick="connectSender('${sender.id}')">
                        <i class="fas fa-plug"></i>
                        Connect
                    </button>` :
                    `<button class="btn-danger" onclick="disconnectSender('${sender.id}')">
                        <i class="fas fa-unlink"></i>
                        Disconnect
                    </button>`
                }
                <button class="btn-secondary" onclick="viewSenderDetails('${sender.id}')">
                    <i class="fas fa-eye"></i>
                    Details
                </button>
                <button class="btn-secondary" onclick="showQRCode('${sender.id}')">
                    <i class="fas fa-qrcode"></i>
                    QR Code
                </button>
                <button class="btn-danger" onclick="deleteSender('${sender.id}')">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

function showAddSenderModal() {
    const modal = `
        <div class="modal-overlay" id="addSenderModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Sender</h3>
                    <button class="modal-close" onclick="closeModal('addSenderModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="addSenderForm" class="modal-form">
                    <div class="form-group">
                        <label for="senderName">Sender Name</label>
                        <input type="text" id="senderName" name="name" placeholder="Enter a name for this sender" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="senderNumber">Phone Number</label>
                        <input type="text" id="senderNumber" name="number" placeholder="+1234567890" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="senderDescription">Description (Optional)</label>
                        <textarea id="senderDescription" name="description" rows="3" placeholder="Description for this sender"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-group">
                            <input type="checkbox" id="autoConnect" name="autoConnect" checked>
                            <label for="autoConnect">Auto-connect after adding</label>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('addSenderModal')">
                            Cancel
                        </button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-plus"></i>
                            Add Sender
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modal;
    
    // Add form submit handler
    document.getElementById('addSenderForm').addEventListener('submit', handleAddSender);
}

async function handleAddSender(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const senderData = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/api/senders/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(senderData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Sender added successfully!', 'success');
            closeModal('addSenderModal');
            loadSendersData();
            
            if (senderData.autoConnect) {
                setTimeout(() => {
                    connectSender(result.senderId);
                }, 1000);
            }
        } else {
            showToast(result.message || 'Failed to add sender', 'error');
        }
    } catch (error) {
        console.error('Error adding sender:', error);
        showToast('Network error while adding sender', 'error');
    }
}

async function connectSender(senderId) {
    try {
        const response = await fetch(`/api/senders/${senderId}/connect`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Connecting sender...', 'info');
            
            if (result.qrCode) {
                showQRCodeModal(senderId, result.qrCode);
            }
            
            loadSendersData();
        } else {
            showToast(result.message || 'Failed to connect sender', 'error');
        }
    } catch (error) {
        console.error('Error connecting sender:', error);
        showToast('Network error while connecting sender', 'error');
    }
}

async function disconnectSender(senderId) {
    if (!confirm('Are you sure you want to disconnect this sender?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/senders/${senderId}/disconnect`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Sender disconnected!', 'info');
            loadSendersData();
        } else {
            showToast(result.message || 'Failed to disconnect sender', 'error');
        }
    } catch (error) {
        console.error('Error disconnecting sender:', error);
        showToast('Network error while disconnecting sender', 'error');
    }
}

async function deleteSender(senderId) {
    if (!confirm('Are you sure you want to delete this sender? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/senders/${senderId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Sender deleted successfully!', 'success');
            loadSendersData();
        } else {
            showToast(result.message || 'Failed to delete sender', 'error');
        }
    } catch (error) {
        console.error('Error deleting sender:', error);
        showToast('Network error while deleting sender', 'error');
    }
}

function showQRCode(senderId) {
    // Get QR code for existing sender
    fetch(`/api/senders/${senderId}/qr`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.qrCode) {
            showQRCodeModal(senderId, data.qrCode);
        } else {
            showToast('QR code not available', 'info');
        }
    })
    .catch(error => {
        console.error('Error getting QR code:', error);
        showToast('Failed to get QR code', 'error');
    });
}

function showQRCodeModal(senderId, qrCode) {
    const modal = `
        <div class="modal-overlay" id="qrCodeModal">
            <div class="modal-content qr-modal">
                <div class="modal-header">
                    <h3>WhatsApp QR Code</h3>
                    <button class="modal-close" onclick="closeModal('qrCodeModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="qr-content">
                    <div class="qr-code-container">
                        <img src="${qrCode}" alt="WhatsApp QR Code" id="qrCodeImage">
                    </div>
                    
                    <div class="qr-instructions">
                        <h4>How to connect:</h4>
                        <ol>
                            <li>Open WhatsApp on your phone</li>
                            <li>Go to Settings > Linked Devices</li>
                            <li>Tap "Link a Device"</li>
                            <li>Scan this QR code</li>
                        </ol>
                    </div>
                    
                    <div class="qr-status" id="qrStatus">
                        <i class="fas fa-spinner fa-spin"></i>
                        Waiting for scan...
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="refreshQRCode('${senderId}')">
                        <i class="fas fa-refresh"></i>
                        Refresh QR
                    </button>
                    <button class="btn-secondary" onclick="closeModal('qrCodeModal')">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modal;
    
    // Monitor connection status
    monitorConnectionStatus(senderId);
}

function monitorConnectionStatus(senderId) {
    const statusInterval = setInterval(() => {
        fetch(`/api/senders/${senderId}/status`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            const statusEl = document.getElementById('qrStatus');
            if (statusEl) {
                if (data.status === 'connected') {
                    statusEl.innerHTML = `
                        <i class="fas fa-check-circle" style="color: #4CAF50;"></i>
                        Connected successfully!
                    `;
                    clearInterval(statusInterval);
                    setTimeout(() => {
                        closeModal('qrCodeModal');
                        loadSendersData();
                    }, 2000);
                }
            }
        })
        .catch(error => {
            console.error('Error checking status:', error);
        });
    }, 2000);
    
    // Clear interval when modal is closed
    setTimeout(() => {
        clearInterval(statusInterval);
    }, 60000); // Stop checking after 1 minute
}

function refreshQRCode(senderId) {
    connectSender(senderId);
}

function viewSenderDetails(senderId) {
    // Implementation for viewing sender details
    showToast('Sender details feature coming soon!', 'info');
}

function refreshSenders() {
    showToast('Refreshing senders...', 'info');
    loadSendersData();
}

function filterSenders() {
    const searchTerm = document.getElementById('senderSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    const senderCards = document.querySelectorAll('.sender-card');
    
    senderCards.forEach(card => {
        const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const number = card.querySelector('.sender-number')?.textContent.toLowerCase() || '';
        const status = card.querySelector('.status-badge')?.textContent.toLowerCase() || '';
        
        const matchesSearch = name.includes(searchTerm) || number.includes(searchTerm);
        const matchesStatus = !statusFilter || status === statusFilter;
        
        if (matchesSearch && matchesStatus) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

