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
    if (req.method !== 'GET') return res.status(405).end();
    try {
        const token = req.headers.authorization.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const userId = decoded.uid;

        const secret = authenticator.generateSecret();
        const otpauthUrl = authenticator.keyuri(decoded.email, 'SecurePortal', secret);

        await db.collection('users').doc(userId).update({
            tempTwoFactorSecret: secret,
            twoFactorEnabled: false
        });

        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
        return res.status(200).json({ qrCodeUrl, secret });
    } catch (err) { return res.status(500).json({ error: err.message }); }
}