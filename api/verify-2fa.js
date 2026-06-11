// api/verify-2fa.js
const { db, auth } = require('./firebase');
const { authenticator } = require('otplib');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    try {
        if (!req.headers.authorization) return res.status(401).end();
        const token = req.headers.authorization.split('Bearer ')[1];
        const decoded = await auth.verifyIdToken(token);
        const userId = decoded.uid;
        
        const { code, skipMfa } = req.body;

        // User chose to bypass MFA registration steps
        if (skipMfa) {
            await db.collection('users').doc(userId).update({
                twoFactorConfigured: false,
                twoFactorEnabled: false
            });
            return res.status(200).json({ success: true, bypassed: true });
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'Profile documents mismatch.' });

        const userData = userDoc.data();
        const secretToCheck = userData.twoFactorSecret || userData.tempTwoFactorSecret;

        if (!secretToCheck) return res.status(400).json({ error: '2FA parameters not initialized.' });

        const isValid = authenticator.check(code, secretToCheck);

        if (isValid) {
            await db.collection('users').doc(userId).update({
                twoFactorSecret: secretToCheck,
                twoFactorConfigured: true,
                twoFactorEnabled: true,
                tempTwoFactorSecret: null
            });
            return res.status(200).json({ success: true });
        } else {
            return res.status(400).json({ error: 'Cryptographic token validation failed. Check your device clock settings.' });
        }
    } catch (err) { 
        return res.status(500).json({ error: err.message }); 
    }
}