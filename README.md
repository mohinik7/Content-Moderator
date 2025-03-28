﻿# Content Moderator - AI Online Harm Detection System

This is an MVP for an AI-powered content moderation system that detects harmful content including toxicity, cyberbullying, and other forms of online harm.

## Features

- Content submission via file uploads or direct text input
- Multi-model AI analysis (Perspective API, custom cyberbullying classifier, Gemini LLM)
- Content classification into Safe, Potentially Harmful, and Harmful categories
- Dashboard for reviewing moderation results
- Historical record of past submissions

## Setup & Installation

### Prerequisites

- Node.js (v14 or later)
- NPM (v6 or later)
- Google Cloud Platform account with:
  - Perspective API enabled
  - Gemini API enabled
  - Google Drive API enabled
- Firebase project with Firestore database

### Environment Setup

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/Content-Moderator.git
   cd Content-Moderator
   ```

2. Install backend dependencies

   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies

   ```bash
   cd ../frontend
   npm install
   ```

4. Create a `.env` file in the backend directory with the following variables:

   ```
   PERSPECTIVE_API_KEY=your_perspective_api_key
   GEMINI_API_KEY=your_gemini_api_key
   FIREBASE_DATABASE_URL=your_firebase_database_url
   GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id
   PORT=5000
   ```

5. Create required directories:

   ```bash
   mkdir -p backend/uploads backend/downloads
   ```

6. Add your Firebase service account credentials:
   - Option 1: Save service account JSON as `backend/utils/content-moderator-drive.json`
   - Option 2: Add as environment variable:
     ```
     FIREBASE_CONFIG={"type":"service_account","project_id":"..."}
     GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
     ```

### Running the Application

1. Start the backend server:

   ```bash
   cd backend
   node server.js
   ```

2. Start the frontend development server:

   ```bash
   cd frontend
   npm start
   ```

3. Access the application at [http://localhost:3000](http://localhost:3000)



## License

This project is licensed under the MIT License - see the LICENSE file for details.
