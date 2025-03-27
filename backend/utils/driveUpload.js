const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");
const stream = require("stream");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Load Google Drive credentials
console.log("Current directory:", __dirname);

// Then use this path resolution
const KEY_FILE_PATH = path.join(__dirname, "content-moderator-drive.json");
console.log("Resolved Path:", KEY_FILE_PATH);

// Check if file exists
if (!fs.existsSync(KEY_FILE_PATH)) {
    console.error("Error: Service account file not found, but will try to use environment variables");
}

// Authenticate Google Drive API - try to use environment variables first
let auth;
try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        // If we have the credentials as a JSON string in an environment variable
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ["https://www.googleapis.com/auth/drive.file"],
        });
    } else if (fs.existsSync(KEY_FILE_PATH)) {
        // Fall back to local key file
        auth = new google.auth.GoogleAuth({
            keyFile: KEY_FILE_PATH,
            scopes: ["https://www.googleapis.com/auth/drive.file"],
        });
    } else {
        throw new Error("No Google Drive credentials found");
    }
} catch (error) {
    console.error("Error setting up Google Drive authentication:", error);
    process.exit(1);
}

const drive = google.drive({ version: "v3", auth });

/**
 * Upload a file to Google Drive from a buffer
 * @param {Buffer} fileBuffer - File buffer from memory
 * @param {string} fileName - Name of the file
 * @returns {Promise<string>} - Public file URL
 */
async function uploadFileToDrive(fileBuffer, fileName) {
    const fileMetadata = {
        name: fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || "1pRhNdDKehvsEUIKnp2cJrQm8tauYRjpE"], // Use env var or fall back to hardcoded ID
    };

    // Convert buffer to readable stream
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    const media = {
        mimeType: "text/plain", // Change this dynamically if needed
        body: bufferStream,
    };

    try {
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: "id",
        });

        const fileId = response.data.id;

        // Make the file public
        await drive.permissions.create({
            fileId: fileId,
            requestBody: { role: "reader", type: "anyone" },
        });

        return `https://drive.google.com/uc?id=${fileId}`;
    } catch (error) {
        console.error("Google Drive Upload Error:", error);
        throw error;
    }
}

module.exports = { uploadFileToDrive };
