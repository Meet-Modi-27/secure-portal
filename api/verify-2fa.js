const admin = require('firebase-admin');
const { authenticator } = require('otplib');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
    });
}
const db = admin.firestore();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    try {
        const token = req.headers.authorization.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const userId = decoded.uid;
        const { code } = req.body;

        // Fetch the user's secret from our cloud store
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'User profile mismatch.' });

        const userData = userDoc.data();
        // Fallback to active secret if already verified, otherwise check temp setup seed
        const secretToCheck = userData.twoFactorSecret || userData.tempTwoFactorSecret;

        if (!secretToCheck) return res.status(400).json({ error: '2FA initialization has not been requested.' });

        // Verify the 6-digit code cryptographically using a standard window margin
        const isValid = authenticator.check(code, secretToCheck);

        if (isValid) {
            // If checking a new setup run, promote temp key to permanent key field
            if (!userData.twoFactorEnabled) {
                await db.collection('users').doc(userId).update({
                    twoFactorSecret: secretToCheck,
                    twoFactorEnabled: true,
                    tempTwoFactorSecret: admin.firestore.FieldValue.delete()
                });
            }
            return res.status(200).json({ success: true });
        } else {
            return res.status(400).json({ error: 'Invalid verification token code passed. Please try again.' });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}