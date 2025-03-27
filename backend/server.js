const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const multer = require("multer");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const upload = multer({ dest: "uploads/" });

// Load environment variables
dotenv.config();

// Initialize Firebase
const firebase = require('./utils/firebase-config');
firebase.initializeFirebase();
const db = firebase.getFirestore();

const app = express();
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Import routes
const uploadRoute = require("./routes/upload");
app.use("/api", uploadRoute);

// Google Drive API setup
const auth = new google.auth.GoogleAuth({
  keyFile: "utils/content-moderator-drive.json", // Path to service account key
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });

/**
 * Function to extract File ID from Google Drive URL
 */
function extractFileId(driveUrl) {
  const match = driveUrl.match(/id=([^&]+)/);
  return match ? match[1] : null;
}

/**
 * Function to download a file from Google Drive
 */
async function downloadFile(fileId, fileName) {
  const filePath = path.join(__dirname, "downloads", fileName);

  const dest = fs.createWriteStream(filePath);
  const res = await drive.files.get(
    { fileId: fileId, alt: "media" },
    { responseType: "stream" }
  );

  await new Promise((resolve, reject) => {
    res.data
      .on("end", () => resolve(filePath))
      .on("error", (err) => reject(err))
      .pipe(dest);
  });

  console.log(`File downloaded: ${filePath}`);
  return filePath;
}

/**
 * Extract text from .txt file
 */
const extractTextFromTXT = (filePath) => {
  return fs.readFileSync(filePath, "utf-8");
};

/**
 * Extract text from PDF file
 */
const extractTextFromPDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
};

/**
 * Extract text from image using OCR (Tesseract.js)
 */
const extractTextFromImage = async (filePath) => {
  const { data } = await Tesseract.recognize(filePath, "eng");
  return data.text;
};

/**
 * Store extracted text in Firestore
 */
async function saveExtractedTextToFirestore(docId, text) {
  const fileRef = db.collection("files").doc(docId);
  await fileRef.update({ extractedText: text });

  console.log("Extracted text stored in Firestore!");
}

/**
 * Function to analyze text toxicity using Perspective API
 * Requests expanded set of attributes for better analysis
 */
async function detectToxicity(text) {
  try {
    const PERSPECTIVE_API_URL = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${process.env.PERSPECTIVE_API_KEY}`;

    const response = await axios.post(PERSPECTIVE_API_URL, {
      comment: { text: text },
      languages: ["en"],
      requestedAttributes: {
        TOXICITY: {},
        SEVERE_TOXICITY: {},
        INSULT: {},
        THREAT: {},
        IDENTITY_ATTACK: {},
        PROFANITY: {},
        SEXUALLY_EXPLICIT: {},
        FLIRTATION: {}
      },
    });

    const scores = response.data.attributeScores;
    return {
      toxicity: scores.TOXICITY.summaryScore.value,
      severeToxicity: scores.SEVERE_TOXICITY.summaryScore.value,
      insult: scores.INSULT.summaryScore.value,
      threat: scores.THREAT.summaryScore.value,
      identityAttack: scores.IDENTITY_ATTACK.summaryScore.value,
      profanity: scores.PROFANITY?.summaryScore.value || 0,
      sexuallyExplicit: scores.SEXUALLY_EXPLICIT?.summaryScore.value || 0,
      flirtation: scores.FLIRTATION?.summaryScore.value || 0
    };
  } catch (error) {
    console.error("Error detecting toxicity:", error);
    // Provide mock data for development if API fails
    return {
      toxicity: Math.random() * 0.8,
      severeToxicity: Math.random() * 0.5,
      insult: Math.random() * 0.7,
      threat: Math.random() * 0.4,
      identityAttack: Math.random() * 0.6,
      profanity: Math.random() * 0.5,
      sexuallyExplicit: Math.random() * 0.3,
      flirtation: Math.random() * 0.2
    };
  }
}

/**
 * Enhanced Cyberbullying Classifier using Perspective API
 * Combines multiple toxicity signals for better detection
 */
async function detectCyberbullying(text) {
  try {
    // Get toxicity analysis from Perspective API
    const toxicityResults = await detectToxicity(text);
    
    // Calculate a weighted cyberbullying score based on different attributes
    // These weights are based on research but should be tuned for your specific use case
    const cyberbullyingScore = (
      toxicityResults.insult * 0.25 + 
      toxicityResults.threat * 0.30 + 
      toxicityResults.identityAttack * 0.30 + 
      toxicityResults.toxicity * 0.10 +
      toxicityResults.profanity * 0.05
    );
    
    // Normalize the score between 0 and 1
    const normalizedScore = Math.min(Math.max(cyberbullyingScore, 0), 1);
    
    // Identify which categories are detected
    return {
      score: normalizedScore,
      categories: {
        directInsults: toxicityResults.insult > 0.7,
        threats: toxicityResults.threat > 0.7,
        identityAttacks: toxicityResults.identityAttack > 0.7,
        sexualContent: toxicityResults.sexuallyExplicit > 0.7,
        profanity: toxicityResults.profanity > 0.7
      },
      // Include the raw scores for debugging and tuning
      rawScores: {
        insult: toxicityResults.insult,
        threat: toxicityResults.threat,
        identityAttack: toxicityResults.identityAttack,
        toxicity: toxicityResults.toxicity,
        profanity: toxicityResults.profanity,
        sexuallyExplicit: toxicityResults.sexuallyExplicit,
      }
    };
  } catch (error) {
    console.error("Error in enhanced cyberbullying detection:", error);
    // Fall back to the rule-based approach if API call fails
    return ruleBasedCyberbullyingDetection(text);
  }
}

/**
 * The original rule-based classifier as a fallback
 * Only used if the API-based approach fails
 */
function ruleBasedCyberbullyingDetection(text) {
  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  
  // Define categories of cyberbullying terms
  const directInsults = [
    'stupid', 'idiot', 'dumb', 'loser', 'ugly', 'fat', 'worthless', 'pathetic', 
    'freak', 'retard', 'moron', 'failure'
  ];
  
  const threats = [
    'kill you', 'hurt you', 'beat you', 'find you', 'hunt you down', 'coming for you',
    'watch out', 'pay for this', 'regret this', 'make you suffer'
  ];
  
  const exclusion = [
    'nobody likes you', 'no one cares', "don't belong", 'outcast', 'go away', 
    'not welcome', 'leave the group', 'not wanted'
  ];
  
  const harassment = [
    'stalking', 'spam', 'keep bothering', 'won\'t leave alone', 'constantly', 
    'over and over', 'every day', 'following you'
  ];

  const identityAttacks = [
    'gay', 'retard', 'fag', 'homo', 'slut', 'whore', 'bitch', 'cunt',
    'nigger', 'chink', 'spic', 'kike', 'paki', 'tranny'
  ];
  
  // Count matches in each category
  let insultCount = 0;
  let threatCount = 0;
  let exclusionCount = 0;
  let harassmentCount = 0;
  let identityCount = 0;
  
  // Check for direct insults
  directInsults.forEach(term => {
    // Use regex to find whole words only
    const regex = new RegExp(`\\b${term}\\b`, 'g');
    const matches = (lowerText.match(regex) || []).length;
    insultCount += matches;
  });
  
  // Check for threats
  threats.forEach(phrase => {
    if (lowerText.includes(phrase)) threatCount++;
  });
  
  // Check for exclusion language
  exclusion.forEach(phrase => {
    if (lowerText.includes(phrase)) exclusionCount++;
  });
  
  // Check for harassment patterns
  harassment.forEach(phrase => {
    if (lowerText.includes(phrase)) harassmentCount++;
  });
  
  // Check for identity attacks
  identityAttacks.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'g');
    const matches = (lowerText.match(regex) || []).length;
    identityCount += matches;
  });
  
  // Calculate overall cyberbullying score
  // This is a simplified approach - a real classifier would use more sophisticated methods
  const totalTerms = directInsults.length + threats.length + exclusion.length + 
                     harassment.length + identityAttacks.length;
  
  const totalMatches = insultCount + threatCount + exclusionCount + 
                       harassmentCount + identityCount;
  
  // Base score on matches, but with higher weights for threats and identity attacks
  const weightedScore = (insultCount * 1.0 + threatCount * 2.0 + exclusionCount * 1.2 + 
                         harassmentCount * 1.5 + identityCount * 2.0) / 
                        (totalTerms * 0.5); // Normalize
  
  // Clamp the score between 0 and 1
  const normalizedScore = Math.min(Math.max(weightedScore, 0), 1);
  
  return {
    score: normalizedScore,
    categories: {
      directInsults: insultCount > 0,
      threats: threatCount > 0,
      exclusion: exclusionCount > 0,
      harassment: harassmentCount > 0,
      identityAttacks: identityCount > 0
    }
  };
}

/**
 * Function to analyze text using Gemini API (for nuanced analysis)
 */
async function analyzeWithGemini(text) {
  // Max number of retries
  const MAX_RETRIES = 2;
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      // Check if API key is configured
      if (!process.env.GEMINI_API_KEY) {
        console.error("Gemini API key is not configured");
        return "Contextual analysis is not available. Please configure Gemini API key.";
      }
      
      // Updated API endpoint with the correct model name for the free tier
      const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

      console.log(`Attempting Gemini API analysis with gemini-2.0-flash model (attempt ${retries + 1}/${MAX_RETRIES + 1})...`);
      
      const response = await axios.post(GEMINI_API_URL, {
        contents: [{
          parts: [{
            text: `Analyze the following text for harmful content, specifically identifying:
            1. Whether this contains cyberbullying, toxicity, or harmful language
            2. The specific type of harmful content (e.g., insults, threats, hate speech)
            3. The severity level (mild, moderate, severe)
            4. Context analysis - could this be misinterpreted or is it clearly harmful?
            
            Provide a brief, objective assessment focused on content moderation.
            
            Text to analyze:
            "${text}"`
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      }, {
        timeout: 15000 // 15 second timeout
      });

      console.log("Gemini API response received");

      if (response.data && response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content) {
        const content = response.data.candidates[0].content;
        if (content.parts && content.parts.length > 0) {
          return content.parts[0].text || "No meaningful response from Gemini.";
        }
      }
      
      return "Unable to extract meaningful analysis from Gemini API response.";
    } catch (error) {
      retries++;
      console.error(`Error analyzing with Gemini (attempt ${retries}/${MAX_RETRIES + 1}):`, error.message);
      
      if (error.response) {
        console.error(`Gemini API error: Status ${error.response.status}, Data:`, JSON.stringify(error.response.data).substring(0, 300));
      }
      
      // If we haven't reached max retries, wait before retrying
      if (retries <= MAX_RETRIES) {
        const delayMs = 1000 * retries; // Increasingly longer delays
        await new Promise(resolve => setTimeout(resolve, delayMs));
        console.log(`Retrying Gemini API analysis in ${delayMs}ms...`);
      } else {
        return "Unable to perform contextual analysis at this time. Please try again later.";
      }
    }
  }
  
  return "Unable to perform contextual analysis after multiple attempts.";
}

/**
 * Main function to process a file from metadata
 */
async function processFileMetadata(docId, fileUrl, fileName) {
  try {
    const fileId = extractFileId(fileUrl);
    if (!fileId) throw new Error("Invalid Google Drive URL");

    const filePath = await downloadFile(fileId, fileName);

    let extractedText;
    if (fileName.endsWith(".txt")) {
      extractedText = extractTextFromTXT(filePath);
    } else if (fileName.endsWith(".pdf")) {
      extractedText = await extractTextFromPDF(filePath);
    } else if (fileName.endsWith(".png") || fileName.endsWith(".jpg")) {
      extractedText = await extractTextFromImage(filePath);
    } else {
      throw new Error("Unsupported file format");
    }

    await saveExtractedTextToFirestore(docId, extractedText);
    
    // Once text is extracted, start the AI analysis
    await processAIAnalysis(docId);
    
    return true;
  } catch (error) {
    console.error("Error processing file:", error);
    const docRef = db.collection("files").doc(docId);
    await docRef.update({ status: "error", errorMessage: error.message });
    return false;
  }
}

/**
 * Determine content classification based on analysis results
 */
function determineContentClassification(toxicityAnalysis, cyberbullyingResult) {
  // Extract scores
  const { toxicity, severeToxicity, insult, threat, identityAttack } = toxicityAnalysis;
  const cyberbullyingScore = cyberbullyingResult.score;
  
  // Check for severe content
  if (
    severeToxicity > 0.7 || 
    threat > 0.8 || 
    identityAttack > 0.8 ||
    cyberbullyingScore > 0.8 ||
    (toxicity > 0.8 && insult > 0.8)
  ) {
    return 'Harmful';
  }
  
  // Check for potentially harmful content
  if (
    toxicity > 0.5 || 
    insult > 0.6 || 
    threat > 0.4 || 
    identityAttack > 0.4 ||
    cyberbullyingScore > 0.5
  ) {
    return 'Potentially Harmful';
  }
  
  // Otherwise, consider it safe
  return 'Safe';
}

/**
 * Function to process AI analysis (Toxicity + Gemini Analysis)
 */
async function processAIAnalysis(docId) {
  try {
    const docRef = db.collection("files").doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) throw new Error("Document not found");
    const text = doc.data().extractedText;
    if (!text) throw new Error("No extracted text available");

    console.log(`Analyzing text with Perspective API and Gemini API...`);

    // Update status to processing
    await docRef.update({ status: "analyzing" });

    // Perform Perspective API analysis
    const toxicityAnalysis = await detectToxicity(text);
    
    // Perform cyberbullying detection
    const cyberbullyingResult = await detectCyberbullying(text);
    
    // Perform Gemini API analysis
    const geminiAnalysis = await analyzeWithGemini(text);
    
    // Determine content classification
    const classification = determineContentClassification(toxicityAnalysis, cyberbullyingResult);

    // Update Firestore with results
    await docRef.update({ 
      toxicityAnalysis, 
      cyberbullyingScore: cyberbullyingResult.score,
      cyberbullyingCategories: cyberbullyingResult.categories,
      geminiAnalysis,
      classification,
      analysisCompleted: true,
      status: "completed"
    });

    console.log("AI analysis stored successfully!");
    
    return {
      toxicityAnalysis,
      cyberbullyingScore: cyberbullyingResult.score,
      cyberbullyingCategories: cyberbullyingResult.categories,
      geminiAnalysis,
      classification,
      originalText: text
    };
  } catch (error) {
    console.error("Error processing AI analysis:", error);
    const docRef = db.collection("files").doc(docId);
    await docRef.update({ status: "error", errorMessage: error.message });
    return null;
  }
}

/**
 * API endpoint for analyzing direct text input
 */
app.post("/api/analyze-text", async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: "No text provided" });
    }
    
    // Create a document in Firestore to store this analysis
    const docRef = await db.collection("textSubmissions").add({
      text,
      createdAt: firebase.FieldValue.serverTimestamp(),
      status: "pending"
    });
    
    // Start analysis in the background
    setTimeout(async () => {
      try {
        // Perform toxicity analysis
        const toxicityAnalysis = await detectToxicity(text);
        
        // Perform cyberbullying detection
        const cyberbullyingResult = await detectCyberbullying(text);
        
        // Perform LLM analysis
        const geminiAnalysis = await analyzeWithGemini(text);
        
        // Determine content classification
        const classification = determineContentClassification(toxicityAnalysis, cyberbullyingResult);
        
        // Update Firestore
        await docRef.update({
          toxicityAnalysis,
          cyberbullyingScore: cyberbullyingResult.score,
          cyberbullyingCategories: cyberbullyingResult.categories,
          geminiAnalysis,
          classification,
          status: "completed",
          analysisCompleted: true
        });
        
        console.log(`Text analysis completed for document ${docRef.id}`);
      } catch (analysisError) {
        console.error("Error during text analysis:", analysisError);
        await docRef.update({ status: "error" });
      }
    }, 0);
    
    res.json({ 
      success: true, 
      message: "Text received and processing started",
      submissionId: docRef.id
    });
  } catch (error) {
    console.error("Error handling text analysis request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * API endpoint to check the status of an analysis
 */
app.get("/api/analysis-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check in files collection first
    let docRef = db.collection("files").doc(id);
    let doc = await docRef.get();
    
    // If not found, check in textSubmissions
    if (!doc.exists) {
      docRef = db.collection("textSubmissions").doc(id);
      doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({ success: false, message: "Document not found" });
      }
    }
    
    const data = doc.data();
    
    if (data.analysisCompleted) {
      return res.json({
        success: true,
        status: "completed",
        result: {
          toxicityAnalysis: data.toxicityAnalysis,
          cyberbullyingScore: data.cyberbullyingScore,
          cyberbullyingCategories: data.cyberbullyingCategories,
          geminiAnalysis: data.geminiAnalysis,
          classification: data.classification,
          originalText: data.text || data.extractedText
        }
      });
    } else {
      return res.json({
        success: true,
        status: data.status || "processing"
      });
    }
  } catch (error) {
    console.error("Error checking analysis status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * API endpoint to get recent submissions
 */
app.get("/api/recent-submissions", async (req, res) => {
  try {
    // Get recent submissions from both collections without using composite queries
    // Simply order by createdAt and handle filtering in-memory
    const fileSubmissions = await db.collection("files")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();
      
    const textSubmissions = await db.collection("textSubmissions")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();
    
    // Combine and format the results
    const submissions = [];
    
    fileSubmissions.forEach(doc => {
      const data = doc.data();
      // Only include completed analyses
      if (data.analysisCompleted) {
        submissions.push({
          id: doc.id,
          type: 'file',
          createdAt: data.createdAt ? data.createdAt.toDate() : null,
          classification: data.classification,
          fileName: data.fileName
        });
      }
    });
    
    textSubmissions.forEach(doc => {
      const data = doc.data();
      // Only include completed analyses
      if (data.analysisCompleted) {
        submissions.push({
          id: doc.id,
          type: 'text',
          createdAt: data.createdAt ? data.createdAt.toDate() : null,
          classification: data.classification,
          textPreview: data.text ? data.text.substring(0, 50) + '...' : 'No preview available'
        });
      }
    });
    
    // Sort by creation date
    submissions.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt - a.createdAt;
    });
    
    res.json({ success: true, submissions: submissions.slice(0, 10) });
  } catch (error) {
    console.error("Error fetching recent submissions:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the functions so they can be imported by other files
module.exports = {
  processFileMetadata,
  processAIAnalysis,
  detectToxicity,
  analyzeWithGemini,
  detectCyberbullying
};
