// api/save.js
const { db, auth } = require('./firebase');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    try {
        if (!req.headers.authorization) return res.status(401).end();
        const token = req.headers.authorization.split('Bearer ')[1];
        const decoded = await auth.verifyIdToken(token);
        const userId = decoded.uid;
        const input = req.body;

        // --- PILLAR 1: INITIAL METRIC MATRIX EQUATIONS ---
        let integrityRisk = (input.dataSensitivity * 3.2) + (input.authMethod * 1.8);
        if (input.controls.encryption) integrityRisk -= 2.0;
        integrityRisk = Math.max(1, Math.min(10, integrityRisk / 1.5));

        let dynamicExposure = (input.portalType * 3.5) + (input.accessLevels * 1.5);
        if (input.controls.waf) dynamicExposure -= 1.5;
        dynamicExposure = Math.max(1, Math.min(10, dynamicExposure / 1.2));

        let accessibilityGap = (input.wcagLevel * 3.3);
        
        let infrastructureOverhead = (input.patchManagement * 3.5);
        if (input.controls.logging) infrastructureOverhead -= 1.0;
        infrastructureOverhead = Math.max(1, Math.min(10, infrastructureOverhead / 1.5));

        let leakExposure = (input.portalType * 4.0) + (input.dataSensitivity * 3.0);
        if (input.controls.encryption) leakExposure -= 3.5;
        if (input.controls.waf) leakExposure -= 1.5;
        leakExposure = Math.max(1, Math.min(10, leakExposure / 1.5));

        let assistiveFriction = (input.authMethod * 4.0) + (input.accessLevels * 2.5);
        if (input.wcagLevel === 1) assistiveFriction -= 2.0;
        assistiveFriction = Math.max(1, Math.min(10, assistiveFriction / 1.5));

        let complianceDelta = Math.abs(input.wcagLevel - 1) * 3.5;
        if (input.controls.logging) complianceDelta += 1.0;
        complianceDelta = Math.max(1, Math.min(10, complianceDelta));

        // --- PILLAR 2: NEW EXTENDED METRIC CALCULATIONS ---
        // 1. Assistive Interoperability Degradation Index (High perimeter defense + missing optimization triggers breaks)
        let assistiveInteroperability = (input.perimeterHardening * 2.5) + (input.wcagLevel * 2.0);
        if (input.ariaOptimization === 1) assistiveInteroperability -= 3.0; // ARIA structural overrides fix it
        assistiveInteroperability = Math.max(1, Math.min(10, assistiveInteroperability));

        // 2. Cryptographic Processing Overhead Ratio (TDE Encryption + High sensitivity spikes lag on client devices)
        let cryptoOverhead = 1.0;
        if (input.controls.encryption) cryptoOverhead += (input.dataSensitivity * 2.5);
        if (input.authMethod === 1) cryptoOverhead += 1.5; // Token verification passes overhead
        cryptoOverhead = Math.max(1, Math.min(10, cryptoOverhead));

        // 3. Session Interruption Hazard Profile (Aggressive timeouts + heavy assistive tech friction = exclusion)
        let sessionHazard = (input.sessionTimeout * 3.5) + (assistiveFriction * 0.5);
        if (input.ariaOptimization === 1) sessionHazard -= 1.0;
        sessionHazard = Math.max(1, Math.min(10, sessionHazard));

        // --- COMPREHENSIVE ALIGNMENT SCORE SUMMARY ---
        const overallScore = (integrityRisk * 0.2) + (leakExposure * 0.15) + (infrastructureOverhead * 0.1) + 
                             (assistiveFriction * 0.15) + (complianceDelta * 0.1) + (assistiveInteroperability * 0.1) + 
                             (cryptoOverhead * 0.1) + (sessionHazard * 0.1);
        
        let tier = "Low";
        if (overallScore > 4.5 && overallScore <= 7.0) tier = "Medium";
        if (overallScore > 7.0) tier = "High";

        // Global Framework Balance Equation Index
        let balanceScore = 100 - Math.abs((integrityRisk * 10) - (accessibilityGap * 10)) - (assistiveFriction * 2) - (sessionHazard * 1.5);
        balanceScore = Math.round(Math.max(5, Math.min(100, balanceScore)));

        const metricsPayload = {
            userId, overallScore, tier, balanceIndex: balanceScore,
            securityRisk: integrityRisk, 
            exposureRisk: dynamicExposure, 
            accessibilityRisk: accessibilityGap, 
            maintainabilityRisk: infrastructureOverhead, 
            leakExposure, assistiveFriction, complianceDelta,
            assistiveInteroperability, // <-- New 2026 Metric Vector Axis
            cryptoOverhead,            // <-- New 2026 Metric Vector Axis
            sessionHazard,             // <-- New 2026 Metric Vector Axis
            createdAt: new Date().toISOString()
        };

        await db.collection('assessments').add(metricsPayload);
        return res.status(200).json(metricsPayload);
    } catch (error) { 
        return res.status(500).json({ error: error.message }); 
    }
}