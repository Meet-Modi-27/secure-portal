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

        // --- PILLAR A: CORE SYSTEM RISKS ---
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

        // --- PILLAR B: NEW EXPANDED METRICS ---
        // 1. Data Leak Exposure Index (Higher portal exposure + high data sensitivity scales risk up)
        let leakExposure = (input.portalType * 4.0) + (input.dataSensitivity * 3.0);
        if (input.controls.encryption) leakExposure -= 3.5;
        if (input.controls.waf) leakExposure -= 1.5;
        leakExposure = Math.max(1, Math.min(10, leakExposure / 1.5));

        // 2. Assistive Friction Coefficient (Strict auth + complex security structures build usage barriers)
        let assistiveFriction = (input.authMethod * 4.0) + (input.accessLevels * 2.5);
        if (input.wcagLevel === 1) assistiveFriction -= 2.0; // Level AAA mitigates friction
        assistiveFriction = Math.max(1, Math.min(10, assistiveFriction / 1.5));

        // 3. Compliance Delta Index (Calculates structural distance from optimal AAA compliance settings)
        let complianceDelta = Math.abs(input.wcagLevel - 1) * 3.5;
        if (input.controls.logging) complianceDelta += 1.0; // Audit footprints add visibility
        complianceDelta = Math.max(1, Math.min(10, complianceDelta));

        // --- EQUILIBRIUM SUMMARY EQUATIONS ---
        const overallScore = (integrityRisk * 0.3) + (leakExposure * 0.25) + (infrastructureOverhead * 0.15) + (assistiveFriction * 0.2) + (complianceDelta * 0.1);
        
        let tier = "Low";
        if (overallScore > 4.5 && overallScore <= 7.0) tier = "Medium";
        if (overallScore > 7.0) tier = "High";

        // Balanced Parity Equation
        let balanceScore = 100 - Math.abs((integrityRisk * 10) - (accessibilityGap * 10));
        balanceScore = Math.round(Math.max(10, Math.min(100, balanceScore)));

        const metricsPayload = {
            userId, 
            overallScore, 
            tier, 
            securityRisk: integrityRisk, 
            exposureRisk: dynamicExposure, 
            accessibilityRisk: accessibilityGap, 
            maintainabilityRisk: infrastructureOverhead, 
            leakExposure,       // <-- New Metric
            assistiveFriction,  // <-- New Metric
            complianceDelta,    // <-- New Metric
            balanceIndex: balanceScore,
            createdAt: new Date().toISOString()
        };

        await db.collection('assessments').add(metricsPayload);
        return res.status(200).json(metricsPayload);
    } catch (error) { 
        return res.status(500).json({ error: error.message }); 
    }
}