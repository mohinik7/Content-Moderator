const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

// Reference Firestore
const db = admin.firestore();

// Test Route to Add Data
router.get("/test-firestore", async (req, res) => {
  try {
    const docRef = db.collection("testCollection").doc("testDocument");
    await docRef.set({
      message: "Firestore is working!",
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, message: "Test data added to Firestore!" });
  } catch (error) {
    console.error("Error writing to Firestore:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
