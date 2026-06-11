// api/history.js
const { db, auth } = require('./firebase');

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();
    try {
        if (!req.headers.authorization) return res.status(401).end();
        const token = req.headers.authorization.split('Bearer ')[1];
        const decoded = await auth.verifyIdToken(token);
        
        const snapshot = await db.collection('assessments')
                                 .where('userId', '==', decoded.uid)
                                 .orderBy('createdAt', 'desc')
                                 .limit(10)
                                 .get();
        const history = [];
        snapshot.forEach(doc => { history.push({ id: doc.id, ...doc.data() }); });
        return res.status(200).json(history);
    } catch (error) { 
        return res.status(500).json({ error: error.message }); 
    }
}