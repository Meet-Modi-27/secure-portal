// api/get-profile.js
const { db, auth } = require('./firebase');

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();
    try {
        if (!req.headers.authorization) return res.status(401).end();
        
        const token = req.headers.authorization.split('Bearer ')[1];
        const decoded = await auth.verifyIdToken(token);
        
        const doc = await db.collection('users').doc(decoded.uid).get();
        if(!doc.exists) return res.status(200).json({ initialized: false });
        
        return res.status(200).json(doc.data());
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}