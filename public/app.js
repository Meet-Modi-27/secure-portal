import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// !!! paste your exact Client Web Config keys from the Firebase console here
const firebaseConfig = {
  apiKey: "AIzaSyAz4zQlpi2EtSLxy7Jn9l8g5B7sXvWJC9U",
  authDomain: "portal-d381d.firebaseapp.com",
  projectId: "portal-d381d",
  storageBucket: "portal-d381d.firebasestorage.app",
  messagingSenderId: "170157556781",
  appId: "1:170157556781:web:3edb29d7872c73fb29e4a4",
  measurementId: "G-KK2D0VRPFG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let radarChartInstance = null;
let activeUserToken = null;

// Routing UI Window Maps
const viewTitles = {
    'dashboard': 'User Dashboard (Dynamic)',
    'risk-engine': 'Risk Management Module (Interactive)',
    'audit-logs': 'Security Monitoring (Real-time Logs)',
    'accessibility': 'Accessibility Settings (Interactive)'
};

// 1. DYNAMIC IDENTITY STATE HANDLER
onAuthStateChanged(auth, async (user) => {
    const authBox = document.getElementById('auth-container');
    const portalBox = document.getElementById('portal-container');

    if (user) {
        // User logged in cleanly
        activeUserToken = await user.getIdToken();
        authBox.style.display = 'none';
        portalBox.style.display = 'flex';
        document.getElementById('userDisplayName').innerText = `Welcome back, ${user.email.split('@')[0]}!`;
        
        // Load initial baseline graphics using actual server record arrays fallback 
        fetchCloudAssessmentLogs();
        switchView('dashboard');
    } else {
        // User is logged out
        activeUserToken = null;
        authBox.style.display = 'flex';
        portalBox.style.display = 'none';
    }
});

// INTERACTIVE SUBMISSIONS LOGIC
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPassword').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        alert("Authentication failed: " + err.message);
    }
});

window.triggerSignOut = function() {
    signOut(auth);
};

window.switchView = function(targetViewId) {
    document.querySelectorAll('.nav-item').forEach(elem => elem.classList.remove('active'));
    document.querySelectorAll('.view-module').forEach(elem => elem.classList.remove('active'));
    
    const activeNavItem = Array.from(document.querySelectorAll('.nav-item')).find(elem => elem.textContent.toLowerCase().includes(targetViewId.split('-')[0]));
    if (activeNavItem) activeNavItem.classList.add('active');
    
    const viewNode = document.getElementById(`view-${targetViewId}`);
    if (viewNode) viewNode.classList.add('active');

    document.getElementById('view-title').innerText = viewTitles[targetViewId];
    if (targetViewId === 'audit-logs' || targetViewId === 'dashboard') fetchCloudAssessmentLogs();
};

window.toggleContrast = function(checkbox) {
    document.documentElement.setAttribute('data-theme', checkbox.checked ? 'high-contrast' : 'light');
};

window.adjustTextScale = function(scaleValue) {
    document.documentElement.style.setProperty('--font-scale', scaleValue);
};

window.submitAssessmentData = async function() {
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
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${activeUserToken}` // Pass user token securely
            },
            body: JSON.stringify(payload)
        });
        const metrics = await res.json();
        renderDashboardVisuals(metrics);
        switchView('dashboard');
    } catch (err) {
        console.error('Exception triggered saving footprint runs:', err);
    }
};

async function fetchCloudAssessmentLogs() {
    if (!activeUserToken) return;
    try {
        const res = await fetch('/api/history', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${activeUserToken}` }
        });
        const logs = await res.json();
        
        // Update table logs safely
        const tableBody = document.getElementById('cloudLogsTable');
        if (!logs || logs.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No runs compiled for your account yet.</td></tr>`;
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

        // Also render latest record on standard dashboard charts view frame
        if(logs.length > 0) renderDashboardVisuals(logs[0]);
    } catch (err) {
        console.error('Failed reading target audit logs arrays:', err);
    }
}

function renderDashboardVisuals(metrics) {
    if(!document.getElementById('dash-score')) return;
    document.getElementById('dash-score').innerText = `${metrics.overallScore.toFixed(1)} / 10`;
    document.getElementById('dash-balance').innerText = `${metrics.balanceIndex} / 100`;

    const ctx = document.getElementById('radarChart').getContext('2d');
    if (radarChartInstance) radarChartInstance.destroy();

    const isHighContrast = document.documentElement.getAttribute('data-theme') === 'high-contrast';
    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Security Risk', 'Maintainability', 'Accessibility Gap', 'Exposure Profile'],
            datasets: [{
                label: 'User Workspace Diagnostic Profile Signature',
                data: [metrics.securityRisk, metrics.maintainabilityRisk, metrics.accessibilityRisk, metrics.exposureRisk],
                backgroundColor: isHighContrast ? 'rgba(255,255,0,0.2)' : 'rgba(99, 102, 241, 0.15)',
                borderColor: isHighContrast ? '#ffff00' : '#6366f1',
                pointBackgroundColor: isHighContrast ? '#ffff00' : '#6366f1',
                borderWidth: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { suggestedMin: 0, suggestedMax: 10 } } }
    });
}