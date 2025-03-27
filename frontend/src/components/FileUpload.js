import React, { useState } from "react";
import axios from "axios";
import { Button, TextField, Typography, Box, Paper, CircularProgress, Tabs, Tab, Grid } from "@mui/material";

const FileUpload = ({ onAnalysisCompleted }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [directText, setDirectText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [fileDetails, setFileDetails] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDirectTextChange = (e) => {
    setDirectText(e.target.value);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:5000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setFileDetails({
          fileUrl: response.data.fileUrl,
          fileId: response.data.fileId
        });
        
        setMessage(`Upload successful! Processing your content...`);
        
        // Poll for analysis results
        let attempts = 0;
        const maxAttempts = 30; // More attempts for longer processing
        const pollInterval = setInterval(async () => {
          try {
            console.log(`Checking status for file ID: ${response.data.fileId}`);
            const analysisResponse = await axios.get(`http://localhost:5000/api/analysis-status/${response.data.fileId}`);
            
            if (analysisResponse.data.status === 'completed') {
              clearInterval(pollInterval);
              setMessage("Analysis completed successfully!");
              
              // Call the callback with the analysis results
              if (onAnalysisCompleted) {
                onAnalysisCompleted(analysisResponse.data.result);
              }
            }
            
            attempts++;
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              setMessage("Analysis is taking longer than expected. Please check results later.");
            }
          } catch (pollError) {
            console.error("Error polling for analysis:", pollError);
            clearInterval(pollInterval);
          }
        }, 3000); // Poll every 3 seconds
      } else {
        setMessage("Upload failed. Please try again.");
      }
    } catch (error) {
      setMessage("Upload failed. Please try again.");
      console.error("Upload Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!directText.trim()) {
      setMessage("Please enter some text to analyze.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await axios.post("http://localhost:5000/api/analyze-text", {
        text: directText,
      });

      if (response.data.success) {
        setMessage("Text submitted successfully for analysis!");
        
        // If response already includes analysis results, call the callback
        if (response.data.result && onAnalysisCompleted) {
          onAnalysisCompleted(response.data.result);
        } else if (response.data.submissionId) {
          // Poll for analysis results
          let attempts = 0;
          const maxAttempts = 30;
          const pollInterval = setInterval(async () => {
            try {
              const analysisResponse = await axios.get(`http://localhost:5000/api/analysis-status/${response.data.submissionId}`);
              
              if (analysisResponse.data.status === 'completed') {
                clearInterval(pollInterval);
                setMessage("Analysis completed successfully!");
                
                // Call the callback with the analysis results
                if (onAnalysisCompleted) {
                  onAnalysisCompleted(analysisResponse.data.result);
                }
              }
              
              attempts++;
              if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                setMessage("Analysis is taking longer than expected. Please check results later.");
              }
            } catch (pollError) {
              console.error("Error polling for analysis:", pollError);
              clearInterval(pollInterval);
            }
          }, 3000); // Poll every 3 seconds
        }
      } else {
        setMessage("Analysis request failed. Please try again.");
      }
    } catch (error) {
      setMessage("Analysis request failed. Please try again.");
      console.error("Text Analysis Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: "auto", mt: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom align="center">
        Content Moderation
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="Upload File" />
          <Tab label="Enter Text" />
        </Tabs>
      </Box>

      {tabValue === 0 ? (
        <Box>
          <Typography variant="body1" gutterBottom>
            Upload a file (.txt, .pdf, .jpg, .png) for content moderation
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <Button
                variant="contained"
                component="label"
                fullWidth
              >
                Select File
                <input
                  type="file"
                  accept=".txt,.pdf,.jpg,.png"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleUpload}
                disabled={!file || isLoading}
                fullWidth
              >
                {isLoading ? <CircularProgress size={24} /> : "Upload"}
              </Button>
            </Grid>
          </Grid>
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Selected file: {file.name}
            </Typography>
          )}
          {fileDetails && fileDetails.fileUrl && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              File uploaded: <a href={fileDetails.fileUrl} target="_blank" rel="noopener noreferrer">View file</a>
            </Typography>
          )}
        </Box>
      ) : (
        <Box>
          <Typography variant="body1" gutterBottom>
            Enter text directly for content moderation
          </Typography>
          <TextField
            label="Text to analyze"
            multiline
            rows={4}
            value={directText}
            onChange={handleDirectTextChange}
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleTextSubmit}
            disabled={isLoading}
            fullWidth
          >
            {isLoading ? <CircularProgress size={24} /> : "Analyze Text"}
          </Button>
        </Box>
      )}

      {message && (
        <Box mt={2}>
          <Typography 
            color={message.includes("successful") || message.includes("completed") ? "success.main" : "error.main"}
          >
            {message}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default FileUpload;
