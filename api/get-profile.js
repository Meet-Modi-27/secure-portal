const admin = require('firebase-admin');

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
        
        const doc = await db.collection('users').doc(decoded.uid).get();
        if(!doc.exists) return res.status(200).json({ initialized: false });
        
        const data = doc.data();
        return res.status(200).json({
            name: data.name,
            role: data.role,
            initialized: data.initialized || false,
            twoFactorEnabled: data.twoFactorEnabled || false
        });
    } catch (err) { return res.status(500).json({ error: err.message }); }
}