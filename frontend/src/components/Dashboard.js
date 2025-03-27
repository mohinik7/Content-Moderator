import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  AppBar, 
  Toolbar, 
  Button, 
  Tabs, 
  Tab, 
  Grid, 
  CircularProgress 
} from '@mui/material';
import FileUpload from './FileUpload';
import ContentAnalysisResults from './ContentAnalysisResults';
import RecentSubmissions from './RecentSubmissions';
import axios from 'axios';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [isLoadingSelectedSubmission, setIsLoadingSelectedSubmission] = useState(false);
  
  // Function to handle tab changes
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Fetch recent submissions on component mount
  useEffect(() => {
    const fetchRecentSubmissions = async () => {
      setIsLoadingSubmissions(true);
      try {
        const response = await axios.get('http://localhost:5000/api/recent-submissions');
        if (response.data && response.data.submissions) {
          setRecentSubmissions(response.data.submissions);
        }
      } catch (error) {
        console.error('Error fetching recent submissions:', error);
      } finally {
        setIsLoadingSubmissions(false);
      }
    };

    fetchRecentSubmissions();
    
    // Set up polling to refresh data every 30 seconds
    const intervalId = setInterval(fetchRecentSubmissions, 30000);
    
    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Handler for when analysis is completed
  const handleAnalysisCompleted = (result) => {
    setAnalysisResults(result);
    setActiveTab(1); // Switch to results tab
  };
  
  // Handler for when a submission is selected from the list
  const handleSubmissionSelected = async (submissionId) => {
    setIsLoadingSelectedSubmission(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/analysis-status/${submissionId}`);
      
      if (response.data.status === 'completed' && response.data.result) {
        setAnalysisResults(response.data.result);
        setActiveTab(1); // Switch to results tab
      } else {
        console.log('Selected submission is not yet analyzed or data not available');
      }
    } catch (error) {
      console.error('Error fetching submission details:', error);
    } finally {
      setIsLoadingSelectedSubmission(false);
    }
  };

  return (
    <Box 
      sx={{ 
        flexGrow: 1, 
        backgroundColor: 'background.default', 
        minHeight: '100vh' 
      }}
    >
      <AppBar position="static" sx={{ backgroundColor: 'background.paper' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AI Content Moderation
          </Typography>
          <Button color="inherit">Dashboard</Button>
          <Button color="inherit">Settings</Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {isLoadingSelectedSubmission && (
          <Box display="flex" justifyContent="center" my={2}>
            <CircularProgress />
          </Box>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={activeTab} onChange={handleTabChange} centered>
                <Tab label="Submit Content" />
                <Tab label="Analysis Results" />
              </Tabs>
            </Box>
            
            {activeTab === 0 ? (
              <FileUpload onAnalysisCompleted={handleAnalysisCompleted} />
            ) : (
              <ContentAnalysisResults analysisData={analysisResults} />
            )}
          </Grid>
          
          <Grid item xs={12} md={4}>
            <RecentSubmissions 
              submissions={recentSubmissions}
              loading={isLoadingSubmissions}
              onSelectSubmission={handleSubmissionSelected}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
