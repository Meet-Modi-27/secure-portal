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
    if (req.method !== 'GET') return res.status(405).end();
    try {
        const token = req.headers.authorization.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        
        const snapshot = await db.collection('assessments')
                                 .where('userId', '==', decoded.uid)
                                 .orderBy('createdAt', 'desc')
                                 .limit(10)
                                 .get();
        const history = [];
        snapshot.forEach(doc => { history.push({ id: doc.id, ...doc.data() }); });
        return res.status(200).json(history);
    } catch (error) { return res.status(500).json({ error: error.message }); }
}