const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
const serviceAccount = require("./contentmoderator-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://aicontentmoderator-default-rtdb.firebaseio.com" // Replace with your Firestore URL
});

const db = admin.firestore();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Sample route to test Firestore
app.post("/add-user", async (req, res) => {
    const { name, email } = req.body;

    try {
        await db.collection("users").add({ name, email });
        res.status(200).send("User added successfully!");
    } catch (error) {
        res.status(500).send("Error adding user: " + error);
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
