const admin = require('firebase-admin');

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
        
        await db.collection('users').doc(decoded.uid).set({
            name: req.body.name,
            role: req.body.role,
            initialized: true
        });
        return res.status(200).json({ success: true });
    } catch (err) { return res.status(500).json({ error: err.message }); }
}