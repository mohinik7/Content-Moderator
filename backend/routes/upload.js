const express = require("express");
const multer = require("multer");
const { uploadFileToDrive } = require("../utils/driveUpload");
const fs = require("fs");
const path = require("path");
const firebase = require('../utils/firebase-config');

const router = express.Router();

// Initialize Firestore
const db = firebase.getFirestore();

// Configure Multer for file uploads (store in memory)
const upload = multer({ storage: multer.memoryStorage() });

// File Upload Route
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Extract file details
    const fileBuffer = req.file.buffer;
    const fileName = `${Date.now()}_${req.file.originalname}`;

    // Upload file to Google Drive
    const fileUrl = await uploadFileToDrive(fileBuffer, fileName);

    // Store file URL and additional metadata in Firestore
    const docRef = await db.collection("files").add({ 
      url: fileUrl, 
      fileName: fileName,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
      createdAt: firebase.FieldValue.serverTimestamp(),
      status: "uploaded"
    });

    // Get the document ID
    const docId = docRef.id;

    // Save file locally for processing if it's a text file
    if (req.file.mimetype === 'text/plain' || req.file.originalname.endsWith('.txt')) {
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, fileBuffer);
      
      // Store the extracted text directly in Firestore
      const text = fileBuffer.toString('utf-8');
      await docRef.update({ 
        extractedText: text,
        status: "extracted"
      });
      
      // Start the AI analysis process in the background
      setTimeout(async () => {
        try {
          // Import the processAIAnalysis function using require to avoid circular dependencies
          const { processAIAnalysis } = require('../server');
          
          if (typeof processAIAnalysis === 'function') {
            await processAIAnalysis(docId);
            console.log(`AI analysis process started for document ${docId}`);
          } else {
            console.error("processAIAnalysis is not a function");
          }
        } catch (analyzeError) {
          console.error("Error starting analysis:", analyzeError);
          await docRef.update({ status: "error" });
        }
      }, 0);
    } else {
      // For non-text files, we need to extract text using appropriate methods
      // Start the file metadata processing in the background
      setTimeout(async () => {
        try {
          // Import the processFileMetadata function using require
          const { processFileMetadata } = require('../server');
          
          if (typeof processFileMetadata === 'function') {
            await processFileMetadata(docId, fileUrl, fileName);
            console.log(`File metadata processing started for document ${docId}`);
          } else {
            console.error("processFileMetadata is not a function");
          }
        } catch (processError) {
          console.error("Error processing file metadata:", processError);
          await docRef.update({ status: "error" });
        }
      }, 0);
    }

    res.json({ 
      success: true, 
      message: "File uploaded successfully!", 
      fileUrl, 
      fileId: docId 
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Test API endpoint
router.get("/test-firestore", async (req, res) => {
  try {
    const docRef = await db.collection("test").add({
      message: "Hello from API",
      timestamp: firebase.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, docId: docRef.id });
  } catch (error) {
    console.error("Firestore Test Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
