// api/generate-2fa.js
const { db, auth } = require('./firebase');
const { authenticator } = require('otplib');

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();
    try {
        if (!req.headers.authorization) return res.status(401).end();
        const token = req.headers.authorization.split('Bearer ')[1];
        const decoded = await auth.verifyIdToken(token);
        const userId = decoded.uid;

        const secret = authenticator.generateSecret();
        const otpauthUrl = authenticator.keyuri(decoded.email, 'SecurePortal', secret);

        await db.collection('users').doc(userId).update({
            tempTwoFactorSecret: secret,
            twoFactorEnabled: false
        });

        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
        return res.status(200).json({ qrCodeUrl, secret });
    } catch (err) { 
        return res.status(500).json({ error: err.message }); 
    }
}