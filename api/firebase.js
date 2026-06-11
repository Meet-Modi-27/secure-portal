// api/firebase.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Clean up double-escaped windows line breaks
    if (privateKey && privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey
            })
        });
        console.log("► Firebase Admin SDK successfully connected.");
    } catch (err) {
        console.error("► Global Database Connection Failure:", err.message);
    }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };