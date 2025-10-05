// Dashboard functions
function loadDashboard() {
    const pageContent = document.getElementById('pageContent');
    const pageTitle = document.getElementById('pageTitle');
    
    if (pageTitle) pageTitle.textContent = 'Dashboard';
    
    if (pageContent) {
        pageContent.innerHTML = `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h2>Welcome back, ${currentUser?.username || 'User'}!</h2>
                    <p>Monitor your WhatsApp bug system status and activities</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-bug"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="totalBugs">0</h3>
                            <p>Total Bugs</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-paper-plane"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="activeSenders">0</h3>
                            <p>Active Senders</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="totalUsers">0</h3>
                            <p>Total Users</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="successRate">0%</h3>
                            <p>Success Rate</p>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>System Status</h3>
                            <div class="status-indicator">
                                <span class="status-dot" id="dashboardStatus"></span>
                                <span id="dashboardStatusText">Checking...</span>
                            </div>
                        </div>
                        <div class="card-content">
                            <div class="system-info">
                                <div class="info-item">
                                    <span class="info-label">Uptime:</span>
                                    <span class="info-value" id="systemUptime">--</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Memory Usage:</span>
                                    <span class="info-value" id="memoryUsage">--</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">CPU Usage:</span>
                                    <span class="info-value" id="cpuUsage">--</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Recent Activities</h3>
                            <button class="btn-secondary" onclick="refreshActivities()">
                                <i class="fas fa-refresh"></i>
                            </button>
                        </div>
                        <div class="card-content">
                            <div class="activity-list" id="activityList">
                                <div class="activity-item">
                                    <div class="activity-icon">
                                        <i class="fas fa-info-circle"></i>
                                    </div>
                                    <div class="activity-content">
                                        <p>System initialized</p>
                                        <span class="activity-time">Just now</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Quick Actions</h3>
                        </div>
                        <div class="card-content">
                            <div class="quick-actions">
                                <button class="action-btn" onclick="loadPage('bug')">
                                    <i class="fas fa-bug"></i>
                                    <span>Manage Bugs</span>
                                </button>
                                <button class="action-btn" onclick="loadPage('senders')" ${currentUser?.role !== 'admin' ? 'disabled' : ''}>
                                    <i class="fas fa-paper-plane"></i>
                                    <span>Manage Senders</span>
                                </button>
                                <button class="action-btn" onclick="loadPage('users')" ${currentUser?.role !== 'admin' ? 'disabled' : ''}>
                                    <i class="fas fa-users"></i>
                                    <span>Manage Users</span>
                                </button>
                                <button class="action-btn" onclick="refreshDashboard()">
                                    <i class="fas fa-refresh"></i>
                                    <span>Refresh Data</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card full-width">
                        <div class="card-header">
                            <h3>Performance Chart</h3>
                            <div class="chart-controls">
                                <select id="chartPeriod" onchange="updateChart()">
                                    <option value="24h">Last 24 Hours</option>
                                    <option value="7d">Last 7 Days</option>
                                    <option value="30d">Last 30 Days</option>
                                </select>
                            </div>
                        </div>
                        <div class="card-content">
                            <canvas id="performanceChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load dashboard data
        loadDashboardData();
        
        // Initialize chart
        initializeChart();
        
        // Set up auto-refresh
        setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    }
}

async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateDashboardStats(data);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateDashboardStats(data) {
    // Update stat cards
    const totalBugs = document.getElementById('totalBugs');
    const activeSenders = document.getElementById('activeSenders');
    const totalUsers = document.getElementById('totalUsers');
    const successRate = document.getElementById('successRate');
    
    if (totalBugs) totalBugs.textContent = data.totalBugs || 0;
    if (activeSenders) activeSenders.textContent = data.activeSenders || 0;
    if (totalUsers) totalUsers.textContent = data.totalUsers || 0;
    if (successRate) successRate.textContent = `${data.successRate || 0}%`;
    
    // Update system status
    const dashboardStatus = document.getElementById('dashboardStatus');
    const dashboardStatusText = document.getElementById('dashboardStatusText');
    
    if (dashboardStatus && dashboardStatusText) {
        if (data.systemStatus === 'online') {
            dashboardStatus.className = 'status-dot online';
            dashboardStatusText.textContent = 'System Online';
        } else {
            dashboardStatus.className = 'status-dot offline';
            dashboardStatusText.textContent = 'System Offline';
        }
    }
    
    // Update system info
    const systemUptime = document.getElementById('systemUptime');
    const memoryUsage = document.getElementById('memoryUsage');
    const cpuUsage = document.getElementById('cpuUsage');
    
    if (systemUptime) systemUptime.textContent = data.uptime || '--';
    if (memoryUsage) memoryUsage.textContent = data.memoryUsage || '--';
    if (cpuUsage) cpuUsage.textContent = data.cpuUsage || '--';
    
    // Update activities
    if (data.activities) {
        updateActivityList(data.activities);
    }
}

function updateActivityList(activities) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    if (activities.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-content">
                    <p>No recent activities</p>
                    <span class="activity-time">--</span>
                </div>
            </div>
        `;
        return;
    }
    
    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <p>${activity.message}</p>
                <span class="activity-time">${formatTime(activity.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

function getActivityIcon(type) {
    const icons = {
        'bug': 'fas fa-bug',
        'sender': 'fas fa-paper-plane',
        'user': 'fas fa-user',
        'system': 'fas fa-cog',
        'error': 'fas fa-exclamation-triangle',
        'success': 'fas fa-check-circle'
    };
    
    return icons[type] || 'fas fa-info-circle';
}

function formatTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return time.toLocaleDateString();
}

function refreshDashboard() {
    showToast('Refreshing dashboard...', 'info');
    loadDashboardData();
}

function refreshActivities() {
    loadDashboardData();
}

let performanceChart;

function initializeChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Success Rate',
                data: [],
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                tension: 0.4
            }, {
                label: 'Active Senders',
                data: [],
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
    
    updateChart();
}

async function updateChart() {
    const period = document.getElementById('chartPeriod')?.value || '24h';
    
    try {
        const response = await fetch(`/api/dashboard/chart?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (performanceChart) {
                performanceChart.data.labels = data.labels;
                performanceChart.data.datasets[0].data = data.successRate;
                performanceChart.data.datasets[1].data = data.activeSenders;
                performanceChart.update();
            }
        }
    } catch (error) {
        console.error('Error updating chart:', error);
    }
}

