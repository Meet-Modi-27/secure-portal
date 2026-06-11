import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// !!! REPLACE WITH YOUR REAL FIREBASE KEY CONSOLE OBJECT MAP !!!
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

// Linear stack array to handle structural step trace rewinds cleanly
let navigationHistoryStack = [];
let currentActiveStep = "gateway";

const viewTitles = {
    'dashboard': 'User Dashboard (Framework Metric Summary)',
    'risk-engine': 'Simulation Control Deck (Interactive Parameter Testing)',
    'audit-logs': 'Security Audit Monitoring (Historical Run Storage)',
    'accessibility': 'Accessibility Display Configurations'
};

function showStep(stepName, isGoingBack = false) {
    if (!isGoingBack && stepName !== currentActiveStep) {
        navigationHistoryStack.push(currentActiveStep);
    }
    
    document.querySelectorAll('.auth-step').forEach(step => step.classList.remove('active'));
    const targetedStep = document.getElementById(`step-${stepName}`);
    if (targetedStep) {
        targetedStep.classList.add('active');
        currentActiveStep = stepName;
    }
}

function handleGoBack() {
    if (navigationHistoryStack.length > 0) {
        const previousStep = navigationHistoryStack.pop();
        showStep(previousStep, true);
    }
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

// SECURE WATCHER INTERCEPTOR
onAuthStateChanged(auth, async (user) => {
    const authBox = document.getElementById('auth-container');
    const portalBox = document.getElementById('portal-container');

    if (user) {
        activeUserToken = await user.getIdToken();
        pendingUserContext = user;
        
        try {
            const res = await fetch('/api/get-profile', { headers: { 'Authorization': `Bearer ${activeUserToken}` } });
            const profile = await res.json();

            if (!profile || profile.initialized === false) {
                showStep('enrichment');
            } else if (profile.twoFactorConfigured === undefined) {
                // Profile matches metadata records but has not selected a 2FA option yet
                showStep('mfa-choice');
            } else {
                authBox.style.display = 'none';
                portalBox.style.display = 'flex';
                document.getElementById('userDisplayName').innerText = `Workspace Auditor: ${profile.name}`;
                fetchCloudAssessmentLogs();
                switchView('dashboard');
            }
        } catch (err) {
            showStep('enrichment');
        }
    } else {
        activeUserToken = null;
        pendingUserContext = null;
        navigationHistoryStack = [];
        currentActiveStep = "gateway";
        authBox.style.display = 'flex';
        portalBox.style.display = 'none';
        showStep('gateway');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Navigation Action Bindings
    document.getElementById('to-login-btn')?.addEventListener('click', () => showStep('login'));
    document.getElementById('to-register-btn')?.addEventListener('click', () => showStep('register'));
    
    document.querySelectorAll('.nav-back-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            handleGoBack();
        });
    });

    document.querySelectorAll('.to-login-toggle').forEach(btn => btn.addEventListener('click', () => showStep('login')));
    document.getElementById('btn-google-login')?.addEventListener('click', handleGoogleSignIn);
    document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth));
    
    // Form Action Submit Interceptors
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
        } catch (err) { alert("Credentials validation failure: " + err.message); }
    });

    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await createUserWithEmailAndPassword(auth, document.getElementById('regEmail').value, document.getElementById('regPassword').value);
        } catch (err) { alert("Profile assignment error: " + err.message); }
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
            showStep('mfa-choice');
        } catch (err) { alert("Failed updating metadata mapping records."); }
    });

    // MFA STEP CONDITIONAL BRANCHES
    document.getElementById('mfa-opt-in')?.addEventListener('click', async () => {
        try {
            const setupRes = await fetch('/api/generate-2fa', { headers: { 'Authorization': `Bearer ${activeUserToken}` } });
            const setupData = await setupRes.json();
            
            document.getElementById('mfaQrImage').setAttribute('src', setupData.qrCodeUrl);
            document.getElementById('mfaManualKey').innerText = setupData.secret;
            showStep('mfa-verify');
        } catch (err) { alert("Cryptographic generation exception encountered."); }
    });

    document.getElementById('mfa-opt-out')?.addEventListener('click', async () => {
        try {
            // Write a parameter bypass configuration flag straight down to your Firestore collection
            await fetch('/api/verify-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeUserToken}` },
                body: JSON.stringify({ skipMfa: true })
            });
            window.location.reload();
        } catch (err) { alert("Failed updating workspace settings profiles."); }
    });

    document.getElementById('mfaForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/verify-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeUserToken}` },
                body: JSON.stringify({ code: document.getElementById('mfaCode').value })
            });
            const status = await res.json();
            if (status.success) { window.location.reload(); } 
            else { alert(status.error || "MFA validation sequence rejected."); }
        } catch (err) { alert("Handshake verification error."); }
    });

    // SIDEBAR NAVIGATION AND STYLING SUITE
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const targetView = e.target.getAttribute('data-view');
            if (targetView) switchView(targetView);
        });
    });

    document.getElementById('contrastToggle')?.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.target.checked ? 'high-contrast' : 'light');
    });

    document.getElementById('textScaler')?.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--font-scale', e.target.value);
    });

    document.getElementById('executeDiagnosticsBtn')?.addEventListener('click', submitAssessmentData);
    document.getElementById('exportPdfBtn')?.addEventListener('click', handlePdfExportReport);
});

async function handleGoogleSignIn() {
    try { await signInWithPopup(auth, googleProvider); } catch (err) { alert("Google Handshake Refused: " + err.message); }
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
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No simulations stored. Run calculations inside the Simulation Deck.</td></tr>`;
        return;
    }
    tableBody.innerHTML = logs.map(run => `<tr><td>${new Date(run.createdAt).toLocaleString()}</td><td style="font-weight:600;">${run.overallScore.toFixed(2)} / 10</td><td><span class="badge ${run.tier.toLowerCase()}">${run.tier} Risk</span></td><td style="font-weight:600;">${run.balanceIndex} / 100</td></tr>`).join('');
    if (logs.length > 0) renderDashboardVisuals(logs[0]);
}

function renderDashboardVisuals(metrics) {
    document.getElementById('dash-score').innerText = `${metrics.overallScore.toFixed(1)} / 10`;
    document.getElementById('dash-balance').innerText = `${metrics.balanceIndex} / 100`;
    
    const badge = document.getElementById('dash-tier-badge');
    if (badge) {
        badge.innerText = `${metrics.tier} Risk Tier`;
        badge.className = `badge ${metrics.tier.toLowerCase()}`;
    }

    const ctx = document.getElementById('radarChart').getContext('2d');
    if (radarChartInstance) radarChartInstance.destroy();

    const isHighContrast = document.documentElement.getAttribute('data-theme') === 'high-contrast';
    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Data Integrity Risk', 'Perimeter Exposure Risk', 'User Accessibility Gap', 'System Maintenance Overhead'],
            datasets: [{ 
                label: 'Framework Parameter Matrix Vector', 
                data: [metrics.securityRisk, metrics.exposureRisk, metrics.accessibilityRisk, metrics.maintainabilityRisk], 
                backgroundColor: isHighContrast ? 'rgba(255,255,0,0.2)' : 'rgba(99, 102, 241, 0.15)', 
                borderColor: isHighContrast ? '#ffff00' : '#6366f1', 
                borderWidth: 2 
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { suggestedMin: 0, suggestedMax: 10, ticks: { display: false } } } }
    });
}

function handlePdfExportReport() {
    const reportElement = document.getElementById('pdf-report-target');
    const userEmail = pendingUserContext ? pendingUserContext.email : 'Authorized Workspace Analyst';
    
    const options = {
        margin:       [0.4, 0.4],
        filename:     `Framework_Equilibrium_Audit_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.99 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };

    const watermark = document.createElement('div');
    watermark.innerHTML = `
        <div style="border-bottom: 2px solid #6366f1; padding-bottom: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="font-size: 16px; color: #0f172a; margin:0;">🛡️ Risk Management in Web Portal Framework Audit</h2>
            <p style="font-size: 10px; color: #64748b; text-align: right; margin:0;">
                <strong>Identity Context:</strong> ${userEmail}<br>
                <strong>Execution Window:</strong> ${new Date().toLocaleString()}
            </p>
        </div>
    `;
    
    reportElement.insertBefore(watermark, reportElement.firstChild);
    html2pdf().set(options).from(reportElement).save().then(() => { reportElement.removeChild(watermark); });
}