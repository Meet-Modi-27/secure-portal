let radarChartInstance = null;

const viewTitles = {
    'dashboard': 'User Dashboard (Dynamic)',
    'risk-engine': 'Risk Management Module (Interactive)',
    'audit-logs': 'Security Monitoring (Real-time Logs)',
    'accessibility': 'Accessibility Settings (Interactive)'
};

function switchView(targetViewId) {
    document.querySelectorAll('.nav-item').forEach(elem => elem.classList.remove('active'));
    document.querySelectorAll('.view-module').forEach(elem => elem.classList.remove('active'));
    
    const activeNavItem = Array.from(document.querySelectorAll('.nav-item')).find(elem => elem.textContent.toLowerCase().includes(targetViewId.split('-')[0]));
    if (activeNavItem) activeNavItem.classList.add('active');
    
    const viewNode = document.getElementById(`view-${targetViewId}`);
    if (viewNode) viewNode.classList.add('active');

    document.getElementById('view-title').innerText = viewTitles[targetViewId] || 'System Matrix Console';

    if (targetViewId === 'audit-logs') fetchCloudAssessmentLogs();
}

function toggleContrast(checkbox) {
    document.documentElement.setAttribute('data-theme', checkbox.checked ? 'high-contrast' : 'light');
}

function adjustTextScale(scaleValue) {
    document.documentElement.style.setProperty('--font-scale', scaleValue);
}

async function submitAssessmentData() {
    const payload = {
        portalType: parseInt(document.getElementById('portalType').value),
        authMethod: parseInt(document.getElementById('authMethod').value),
        accessLevels: parseInt(document.getElementById('accessLevels').value),
        updateFrequency: parseInt(document.getElementById('updateFrequency').value),
        dataSensitivity: parseInt(document.getElementById('dataSensitivity').value),
        patchManagement: parseInt(document.getElementById('patchManagement').value),
        wcagLevel: parseInt(document.getElementById('wcagLevel').value),
        controls: {
            waf: document.getElementById('waf').checked,
            logging: document.getElementById('logging').checked,
            encryption: document.getElementById('encryption').checked
        }
    };

    try {
        const res = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const metrics = await res.json();
        
        renderDashboardVisuals(metrics);
        switchView('dashboard');
    } catch (err) {
        console.error('Exception triggered during Vercel serverless processing loops:', err);
    }
}

async function fetchCloudAssessmentLogs() {
    try {
        const res = await fetch('/api/history');
        const logs = await res.json();
        const tableBody = document.getElementById('cloudLogsTable');

        if (!logs || logs.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No runs compiled in Cloud Store collections yet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = logs.map(run => `
            <tr>
                <td>${new Date(run.createdAt).toLocaleString()}</td>
                <td style="font-weight:600;">${run.overallScore.toFixed(2)} / 10</td>
                <td><span class="badge ${run.tier.toLowerCase()}">${run.tier}</span></td>
                <td style="font-weight:600;">${run.balanceIndex} / 100</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Failed processing server query array streams payload:', err);
    }
}

function renderDashboardVisuals(metrics) {
    document.getElementById('dash-score').innerText = `${metrics.overallScore.toFixed(1)} / 10`;
    document.getElementById('dash-balance').innerText = `${metrics.balanceIndex} / 100`;

    const ctx = document.getElementById('radarChart').getContext('2d');
    if (radarChartInstance) radarChartInstance.destroy();

    const isHighContrast = document.documentElement.getAttribute('data-theme') === 'high-contrast';
    const accentColor = isHighContrast ? '#ffff00' : '#6366f1';
    const gridColor = isHighContrast ? '#ffffff' : '#e2e8f0';

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Security Risk', 'Maintainability', 'Accessibility Gap', 'Exposure Profile'],
            datasets: [{
                label: 'System Diagnostic Performance Profile',
                data: [metrics.securityRisk, metrics.maintainabilityRisk, metrics.accessibilityRisk, metrics.exposureRisk],
                backgroundColor: isHighContrast ? 'rgba(255,255,0,0.2)' : 'rgba(99, 102, 241, 0.15)',
                borderColor: accentColor,
                pointBackgroundColor: accentColor,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    grid: { color: gridColor },
                    angleLines: { color: gridColor },
                    pointLabels: { color: isHighContrast ? '#ffffff' : '#0f172a', font: { weight: '600' } },
                    suggestedMin: 0,
                    suggestedMax: 10
                }
            },
            plugins: {
                legend: { labels: { color: isHighContrast ? '#ffffff' : '#0f172a' } }
            }
        }
    });
}

// Set up initial dashboard visual presentation markers automatically upon startup bounds
window.addEventListener('DOMContentLoaded', () => {
    renderDashboardVisuals({
        overallScore: 4.2,
        tier: 'Low',
        securityRisk: 3.5,
        maintainabilityRisk: 4.8,
        accessibilityRisk: 3.3,
        exposureRisk: 5.0,
        balanceIndex: 98
    });
});