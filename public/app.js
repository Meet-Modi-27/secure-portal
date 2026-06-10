import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// !!! PASTE YOUR REAL WEBA CONFIG FROM THE FIREBASE CONSOLE HERE
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
const googleProvider = new GoogleAuthProvider();

let radarChartInstance = null;
let activeUserToken = null;
let pendingUserContext = null; 

const viewTitles = {
    'dashboard': 'User Dashboard (Dynamic)',
    'risk-engine': 'Risk Management Module (Interactive)',
    'audit-logs': 'Security Monitoring (Real-time Logs)',
    'accessibility': 'Accessibility Settings (Interactive)'
};

// 1. STABLE ACCESSIBILITY LAYER WIRE UP
function showStep(stepName) {
    document.querySelectorAll('.auth-step').forEach(step => step.classList.remove('active'));
    const targetedStep = document.getElementById(`step-${stepName}`);
    if (targetedStep) targetedStep.classList.add('active');
}

function switchView(targetViewId) {
    document.querySelectorAll('.nav-item').forEach(elem => elem.classList.remove('active'));
    document.querySelectorAll('.view-module').forEach(elem => elem.classList.remove('active'));
    
    const activeItem = Array.from(document.querySelectorAll('.nav-item')).find(elem => elem.getAttribute('data-view') === targetViewId);
    if (activeItem) activeItem.classList.add('active');
    
    const viewNode = document.getElementById(`view-${targetViewId}`);
    if (viewNode) viewNode.classList.add('active');

    document.getElementById('view-title').innerText = viewTitles[targetViewId] || 'Portal Core';
    if (targetViewId === 'audit-logs' || targetViewId === 'dashboard') fetchCloudAssessmentLogs();
}

// 2. CENTRALIZED EVENT CAPTURE LAYER (Bypasses Module-isolation bounds cleanly)
document.addEventListener('DOMContentLoaded', () => {
    
    // Auth Multi-step routing path toggles
    document.getElementById('to-login-btn')?.addEventListener('click', () => showStep('login'));
    document.getElementById('to-register-btn')?.addEventListener('click', () => showStep('register'));
    document.querySelectorAll('.back-to-gateway').forEach(btn => btn.addEventListener('click', () => showStep('gateway')));
    document.querySelectorAll('.to-login-toggle').forEach(btn => btn.addEventListener('click', () => showStep('login')));
    
    // Auth submission blocks
    document.getElementById('btn-google-login')?.addEventListener('click', handleGoogleSignIn);
    
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
        } catch (err) { alert("Auth Failure: " + err.message); }
    });

    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await createUserWithEmailAndPassword(auth, document.getElementById('regEmail').value, document.getElementById('regPassword').value);
        } catch (err) { alert("Registration Failure: " + err.message); }
    });

    document.getElementById('enrichmentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const profilePayload = {
            name: document.getElementById('profName').value,
            role: document.getElementById('profRole').value
        };
        try {
            await fetch('/api/save-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeUserToken}` },
                body: JSON.stringify(profilePayload)
            });
            document.getElementById('mfaPrompt').innerText = `Enter verification token to initialize workspace metrics for ${profilePayload.name}.`;
            showStep('mfa');
        } catch (err) { alert("Failed initializing profile metadata logs."); }
    });

    document.getElementById('mfaForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = document.getElementById('mfaCode').value;
        if(code.length === 6) {
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('portal-container').style.display = 'flex';
            document.getElementById('userDisplayName').innerText = `Active Context: ${pendingUserContext.email}`;
            fetchCloudAssessmentLogs();
            switchView('dashboard');
        } else {
            alert("Invalid verification parameters.");
        }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth));

    // Sidebar View Navigation Swapping Listeners
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const targetView = e.target.getAttribute('data-view');
            if(targetView) switchView(targetView);
        });
    });

    // Display configurations modifiers
    document.getElementById('contrastToggle')?.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.target.checked ? 'high-contrast' : 'light');
    });

    document.getElementById('textScaler')?.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--font-scale', e.target.value);
    });

    document.getElementById('executeDiagnosticsBtn')?.addEventListener('click', submitAssessmentData);
});

// 3. SECURE ASYNCHRONOUS AUTH TRACKING HOOKS
onAuthStateChanged(auth, async (user) => {
    const authBox = document.getElementById('auth-container');
    const portalBox = document.getElementById('portal-container');

    if (user) {
        activeUserToken = await user.getIdToken();
        pendingUserContext = user;
        
        try {
            const res = await fetch('/api/get-profile', {
                headers: { 'Authorization': `Bearer ${activeUserToken}` }
            });
            const profile = await res.json();

            if (!profile.initialized) {
                showStep('enrichment');
            } else {
                document.getElementById('mfaPrompt').innerText = `Enter token to verify workspace connection for ${profile.name} (${profile.role}).`;
                showStep('mfa');
            }
        } catch (err) {
            showStep('enrichment');
        }
    } else {
        activeUserToken = null;
        pendingUserContext = null;
        authBox.style.display = 'flex';
        portalBox.style.display = 'none';
        showStep('gateway');
    }
});

async function handleGoogleSignIn() {
    try { await signInWithPopup(auth, googleProvider); } catch (err) { alert("Google Auth Failure: " + err.message); }
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

    const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeUserToken}` },
        body: JSON.stringify(payload)
    });
    renderDashboardVisuals(await res.json());
    switchView('dashboard');
}

async function fetchCloudAssessmentLogs() {
    if (!activeUserToken) return;
    const res = await fetch('/api/history', { method: 'GET', headers: { 'Authorization': `Bearer ${activeUserToken}` } });
    const logs = await res.json();
    const tableBody = document.getElementById('cloudLogsTable');
    if (!logs || logs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No records run for your profile block yet.</td></tr>`;
        return;
    }
    tableBody.innerHTML = logs.map(run => `<tr><td>${new Date(run.createdAt).toLocaleString()}</td><td style="font-weight:600;">${run.overallScore.toFixed(2)} / 10</td><td><span class="badge ${run.tier.toLowerCase()}">${run.tier}</span></td><td style="font-weight:600;">${run.balanceIndex} / 100</td></tr>`).join('');
    if(logs.length > 0) renderDashboardVisuals(logs[0]);
}

function renderDashboardVisuals(metrics) {
    document.getElementById('dash-score').innerText = `${metrics.overallScore.toFixed(1)} / 10`;
    document.getElementById('dash-balance').innerText = `${metrics.balanceIndex} / 100`;
    const ctx = document.getElementById('radarChart').getContext('2d');
    if (radarChartInstance) radarChartInstance.destroy();
    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Security Risk', 'Maintainability', 'Accessibility Gap', 'Exposure Profile'],
            datasets: [{ label: 'Metric Context Matrix', data: [metrics.securityRisk, metrics.maintainabilityRisk, metrics.accessibilityRisk, metrics.exposureRisk], backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: '#6366f1', borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { suggestedMin: 0, suggestedMax: 10 } } }
    });
}