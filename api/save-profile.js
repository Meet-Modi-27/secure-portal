// api/save-profile.js
const { db, auth } = require('./firebase');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    try {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: "Missing authorization headers." });
        }
        
        const token = req.headers.authorization.split('Bearer ')[1];
        const decoded = await auth.verifyIdToken(token);
        
        await db.collection('users').doc(decoded.uid).set({
            name: req.body.name || "Meet",
            role: req.body.role || "Risk Manager / Analyst",
            initialized: true,
            twoFactorEnabled: false
        });

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("Local Crash Log in save-profile:", err.message);
        return res.status(500).json({ error: err.message });
    }
}