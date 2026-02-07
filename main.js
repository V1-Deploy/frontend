// ===========================================
// TOPSIDE TRACKER - FRONTEND
// Anonymous User Tracking & API Integration
// ===========================================

// Input Missing Information: Update API_URL if deploying to production
const API_URL = 'http://localhost:3000/api';

// ===========================================
// ANONYMOUS USER ID MANAGEMENT
// ===========================================

/**
 * Get or create anonymous reporter ID
 * Stored in localStorage for persistence
 */
function getReporterId() {
    let reporterId = localStorage.getItem('topside_reporter_id');
    
    if (!reporterId) {
        // Generate new UUID v4
        reporterId = generateUUID();
        localStorage.setItem('topside_reporter_id', reporterId);
        console.log('New reporter ID created:', reporterId);
    }
    
    return reporterId;
}

/**
 * Simple UUID v4 generator (fallback if crypto API not available)
 */
function generateUUID() {
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Initialize reporter ID on page load
const REPORTER_ID = getReporterId();

// ===========================================
// API FUNCTIONS
// ===========================================

/**
 * Submit a report to the backend
 */
async function submitReportAPI(embarkId, reportType) {
    try {
        const response = await fetch(`${API_URL}/reports/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                embarkId: embarkId,
                reportType: reportType,
                reporterId: REPORTER_ID
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit report');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Get report data for an Embark ID
 */
async function getReportsAPI(embarkId) {
    try {
        const response = await fetch(`${API_URL}/reports/${encodeURIComponent(embarkId)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to retrieve reports');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Get report history for trends chart
 */
async function getReportHistoryAPI(embarkId) {
    try {
        const response = await fetch(`${API_URL}/reports/${encodeURIComponent(embarkId)}/history`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to retrieve report history');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===========================================
// VALIDATION FUNCTIONS (Frontend)
// ===========================================

function validateEmbarkId(id) {
    const regex = /^[A-Za-z0-9_]{3,16}#\d{4}$/;
    return regex.test(id);
}

// ===========================================
// LANDING PAGE (index.html) LOGIC
// ===========================================

if (document.getElementById('searchInput')) {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchError = document.getElementById('searchError');
    const reportBtn = document.getElementById('reportBtn');
    const reportPanel = document.getElementById('reportPanel');
    const reportInput = document.getElementById('reportInput');
    const submitReportBtn = document.getElementById('submitReportBtn');
    const reportTypeBtns = document.querySelectorAll('.report-type-btn');

    let selectedReportType = null;

    // Search functionality
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    async function handleSearch() {
        const embarkId = searchInput.value.trim();
        searchError.textContent = '';

        // Validate format
        if (!validateEmbarkId(embarkId)) {
            searchError.textContent = "The ID entered does not follow Embark ID's proper format";
            return;
        }

        // Show loading state
        searchBtn.textContent = 'Searching...';
        searchBtn.disabled = true;

        try {
            // Check if reports exist via API
            const result = await getReportsAPI(embarkId);

            // Redirect to report page regardless (will show data or zeros)
            window.location.href = `report.html?id=${encodeURIComponent(embarkId)}`;
        } catch (error) {
            searchError.textContent = error.message || 'An error occurred while searching';
        } finally {
            searchBtn.textContent = 'Search';
            searchBtn.disabled = false;
        }
    }

    // Toggle report panel
    reportBtn.addEventListener('click', function() {
        reportPanel.classList.toggle('active');
        if (reportPanel.classList.contains('active')) {
            reportInput.focus();
        }
    });

    // Report type selection
    reportTypeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            reportTypeBtns.forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedReportType = this.getAttribute('data-type');
        });
    });

    // Submit report
    submitReportBtn.addEventListener('click', async function() {
        const embarkId = reportInput.value.trim();

        // Validate format
        if (!validateEmbarkId(embarkId)) {
            alert("The ID entered does not follow Embark ID's proper format");
            return;
        }

        // Check if report type is selected
        if (!selectedReportType) {
            alert("Please select a report type");
            return;
        }

        // Show loading state
        submitReportBtn.textContent = 'Submitting...';
        submitReportBtn.disabled = true;

        try {
            // Submit report via API
            const result = await submitReportAPI(embarkId, selectedReportType);

            // Show success message
            alert(`Report submitted successfully for ${embarkId}`);

            // Reset form
            reportInput.value = '';
            reportTypeBtns.forEach(b => b.classList.remove('selected'));
            selectedReportType = null;
            reportPanel.classList.remove('active');
        } catch (error) {
            alert(error.message || 'Failed to submit report. Please try again.');
        } finally {
            submitReportBtn.textContent = 'Submit';
            submitReportBtn.disabled = false;
        }
    });
}

// ===========================================
// REPORT PAGE (report.html) LOGIC
// ===========================================

if (document.getElementById('embarkId')) {
    const urlParams = new URLSearchParams(window.location.search);
    const embarkId = urlParams.get('id');

    const embarkIdElement = document.getElementById('embarkId');
    const totalReportsElement = document.getElementById('totalReports');
    const aimbotCountElement = document.getElementById('aimbotCount');
    const wallhackCountElement = document.getElementById('wallhackCount');
    const macroCountElement = document.getElementById('macroCount');
    const glitchCountElement = document.getElementById('glitchCount');
    const goodplayerCountElement = document.getElementById('goodplayerCount');

    async function loadReportData() {
        if (!embarkId) {
            embarkIdElement.textContent = 'No ID Provided';
            return;
        }

        // Show loading state
        embarkIdElement.textContent = 'Loading...';

        try {
            // Get report data from API
            const result = await getReportsAPI(embarkId);

            // Display data
            embarkIdElement.textContent = result.embarkId;
            totalReportsElement.textContent = result.totalNegative;
            aimbotCountElement.textContent = result.counts.aimbot;
            wallhackCountElement.textContent = result.counts.wallhack;
            macroCountElement.textContent = result.counts.macro;
            glitchCountElement.textContent = result.counts.glitch;
            goodplayerCountElement.textContent = result.counts.goodplayer;

            // Load chart if canvas exists
            if (document.getElementById('reportChart')) {
                await loadReportTrendsChart(embarkId);
            }
        } catch (error) {
            console.error('Error loading report:', error);
            embarkIdElement.textContent = embarkId;
            totalReportsElement.textContent = '0';
        }
    }

    loadReportData();
    loadReportData();

    // ===========================================
    // REPORT BUTTON ON REPORT PAGE
    // ===========================================
    
    const reportBtnPage = document.getElementById('reportBtnPage');
    const reportPanelPage = document.getElementById('reportPanelPage');
    const reportInputPage = document.getElementById('reportInputPage');
    const submitReportBtnPage = document.getElementById('submitReportBtnPage');
    const reportTypeBtnsPage = document.querySelectorAll('.report-type-btn-page');

    let selectedReportTypePage = null;

    // Pre-fill the input with the current embark_id if available
    if (embarkId && reportInputPage) {
        reportInputPage.value = embarkId;
    }

    // Toggle report panel on report page
    if (reportBtnPage) {
        reportBtnPage.addEventListener('click', function() {
            reportPanelPage.classList.toggle('active');
            if (reportPanelPage.classList.contains('active')) {
                reportInputPage.focus();
            }
        });
    }

    // Report type selection on report page
    reportTypeBtnsPage.forEach(btn => {
        btn.addEventListener('click', function() {
            reportTypeBtnsPage.forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedReportTypePage = this.getAttribute('data-type');
        });
    });

    // Submit report from report page
    if (submitReportBtnPage) {
        submitReportBtnPage.addEventListener('click', async function() {
            const embarkIdToReport = reportInputPage.value.trim();

            // Validate format
            if (!validateEmbarkId(embarkIdToReport)) {
                alert("The ID entered does not follow Embark ID's proper format");
                return;
            }

            // Check if report type is selected
            if (!selectedReportTypePage) {
                alert("Please select a report type");
                return;
            }

            // Show loading state
            submitReportBtnPage.textContent = 'Submitting...';
            submitReportBtnPage.disabled = true;

            try {
                // Submit report via API
                const result = await submitReportAPI(embarkIdToReport, selectedReportTypePage);

                // Show success message
                alert(`Report submitted successfully for ${embarkIdToReport}`);

                // Reset form
                reportTypeBtnsPage.forEach(b => b.classList.remove('selected'));
                selectedReportTypePage = null;
                reportPanelPage.classList.remove('active');

                // Reload the page data if reporting the same ID we're viewing
                if (embarkIdToReport === embarkId) {
                    loadReportData();
                }
            } catch (error) {
                alert(error.message || 'Failed to submit report. Please try again.');
            } finally {
                submitReportBtnPage.textContent = 'Submit';
                submitReportBtnPage.disabled = false;
            }
        });
    }
}

// ===========================================
// REPORT TRENDS CHART
// ===========================================

async function loadReportTrendsChart(embarkId) {
    const canvas = document.getElementById('reportChart');
    if (!canvas) return;

    try {
        // Fetch report history from backend
        const result = await getReportHistoryAPI(embarkId);
        const reportHistory = result.history || [];

        // Generate last 30 days
        const last30Days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last30Days.push(dateStr);
        }

        // Count reports per day
        const reportsByDay = {};
        last30Days.forEach(day => {
            reportsByDay[day] = 0;
        });

        // Aggregate report counts by day
        reportHistory.forEach(report => {
            const reportDate = report.created_at.split('T')[0];
            if (reportsByDay.hasOwnProperty(reportDate)) {
                reportsByDay[reportDate]++;
            }
        });

        // Format labels for X-axis (MM/DD)
        const labels = last30Days.map(date => {
            const d = new Date(date);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        });

        // Get counts for Y-axis
        const data = last30Days.map(day => reportsByDay[day]);

        // Destroy existing chart if it exists
        if (window.reportChartInstance) {
            window.reportChartInstance.destroy();
        }

        // Create new chart
        const ctx = canvas.getContext('2d');
        window.reportChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Reports',
                    data: data,
                    borderColor: '#d32f2f',
                    backgroundColor: 'rgba(211, 47, 47, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#d32f2f',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#2a2a2a',
                        borderWidth: 1,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                const count = context.parsed.y;
                                return count === 1 ? '1 report' : `${count} reports`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#b0b0b0',
                            precision: 0
                        },
                        grid: {
                            color: '#2a2a2a',
                            drawBorder: false
                        },
                        border: {
                            display: false
                        }
                    },
                    x: {
                        ticks: {
                            color: '#b0b0b0',
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 15
                        },
                        grid: {
                            color: '#2a2a2a',
                            drawBorder: false
                        },
                        border: {
                            display: false
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error loading chart:', error);
        // Show message on canvas if chart fails
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#666666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Unable to load chart data', canvas.width / 2, canvas.height / 2);
    }
}