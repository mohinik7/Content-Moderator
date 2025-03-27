const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");
const stream = require("stream");

// Load Google Drive credentials
console.log("Current directory:", __dirname);

// Then use this path resolution
const KEY_FILE_PATH = path.join(__dirname, "content-moderator-drive.json");
console.log("Resolved Path:", KEY_FILE_PATH);

// Check if file exists
if (!fs.existsSync(KEY_FILE_PATH)) {
    console.error("Error: File does NOT exist at", KEY_FILE_PATH);
    process.exit(1);
}

// Load credentials using `fs.readFileSync()` instead of `require()`
const credentials = JSON.parse(fs.readFileSync(KEY_FILE_PATH, "utf8"));
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Authenticate Google Drive API
const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: SCOPES,
});
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
        parents: ["1pRhNdDKehvsEUIKnp2cJrQm8tauYRjpE"], // ✅ Folder ID only
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
