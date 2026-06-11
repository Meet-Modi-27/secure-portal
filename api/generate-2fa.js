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
    if (req.method !== 'GET') return res.status(405).end();
    try {
        const token = req.headers.authorization.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const userId = decoded.uid;

        // 1. Generate a new high-entropy secret seed for this user
        const secret = authenticator.generateSecret();
        
        // 2. Build a standard authenticator URI link
        const otpauthUrl = authenticator.keyuri(decoded.email, 'SecurePortal', secret);

        // 3. Temporarily save the unverified secret to their user document
        await db.collection('users').doc(userId).update({
            tempTwoFactorSecret: secret,
            twoFactorEnabled: false
        });

        // 4. Return a public chart API URL that converts our URI into a scannable QR code image
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

        return res.status(200).json({ qrCodeUrl, secret });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}