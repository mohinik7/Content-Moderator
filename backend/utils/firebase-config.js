const admin = require('firebase-admin');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

/**
 * Initialize Firebase Admin SDK
 * When deployed, use environment variables
 * For local development, use a service account file
 */
function initializeFirebase() {
  // Check if we're in a production environment (like Heroku)
  if (process.env.FIREBASE_CONFIG) {
    // Parse the config string into JSON
    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    
    console.log('Firebase initialized with environment variables');
    return;
  }
  
  // For local development, try to use a local service account file
  const keyFilePath = path.join(__dirname, 'content-moderator-drive.json');
  
  if (fs.existsSync(keyFilePath)) {
    const serviceAccount = require(keyFilePath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || "https://aicontentmoderator-default-rtdb.firebaseio.com"
    });
    
    console.log('Firebase initialized with local service account file');
    return;
  }
  
  console.error('No Firebase credentials found. Please set FIREBASE_CONFIG environment variable or provide a service account file.');
  process.exit(1);
}

module.exports = {
  initializeFirebase,
  getFirestore: () => admin.firestore(),
  getDatabase: () => admin.database()
}; 