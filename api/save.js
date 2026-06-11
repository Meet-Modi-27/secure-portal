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

        let securityRisk = (input.dataSensitivity * 3) + (input.authMethod * 2) + (input.portalType * 2);
        if (input.controls.waf) securityRisk -= 1.5;
        if (input.controls.encryption) securityRisk -= 1.5;
        securityRisk = Math.max(1, Math.min(10, securityRisk / 1.5));

        let maintainabilityRisk = (input.patchManagement * 4) + (input.updateFrequency * 2);
        if (input.controls.logging) maintainabilityRisk -= 1;
        maintainabilityRisk = Math.max(1, Math.min(10, maintainabilityRisk / 1.5));

        let accessibilityRisk = (input.wcagLevel * 3.3);
        let exposureRisk = (input.portalType * 3.5) + (input.accessLevels * 1.5);
        if (input.controls.waf) exposureRisk -= 1;
        exposureRisk = Math.max(1, Math.min(10, exposureRisk / 1.2));

        const overallScore = (securityRisk * 0.4) + (exposureRisk * 0.3) + (maintainabilityRisk * 0.2) + (accessibilityRisk * 0.1);
        let tier = "Low";
        if (overallScore > 4.5 && overallScore <= 7.0) tier = "Medium";
        if (overallScore > 7.0) tier = "High";

        let balanceScore = 100 - Math.abs((securityRisk * 10) - (accessibilityRisk * 10));
        balanceScore = Math.round(Math.max(10, Math.min(100, balanceScore)));

        const calculatedMetrics = {
            userId, overallScore, tier, securityRisk, maintainabilityRisk, accessibilityRisk, exposureRisk, balanceIndex: balanceScore,
            createdAt: new Date().toISOString()
        };

        await db.collection('assessments').add(calculatedMetrics);
        return res.status(200).json(calculatedMetrics);
    } catch (error) { 
        return res.status(500).json({ error: error.message }); 
    }
}