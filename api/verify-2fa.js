const admin = require('firebase-admin');
const { authenticator } = require('otplib');

// Copy and paste this exact block at the top of your API files
if (!admin.apps || admin.apps.length === 0) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Local Windows environments sometimes double-escape newlines. This cleans them up!
    if (privateKey && privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
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

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'User profile missing.' });

        const userData = userDoc.data();
        const secretToCheck = userData.twoFactorSecret || userData.tempTwoFactorSecret;

        if (!secretToCheck) return res.status(400).json({ error: '2FA Setup not initialized.' });

        const isValid = authenticator.check(code, secretToCheck);

        if (isValid) {
            if (!userData.twoFactorEnabled) {
                await db.collection('users').doc(userId).update({
                    twoFactorSecret: secretToCheck,
                    twoFactorEnabled: true,
                    tempTwoFactorSecret: admin.firestore.FieldValue.delete()
                });
            }
            return res.status(200).json({ success: true });
        } else {
            return res.status(400).json({ error: 'Invalid verification code token.' });
        }
    } catch (err) { return res.status(500).json({ error: err.message }); }
}