import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Divider, 
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import ReactMarkdown from 'react-markdown';

const ContentAnalysisResults = ({ analysisData }) => {
  if (!analysisData) {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mt: 3, 
          maxWidth: 600, 
          mx: 'auto', 
          backgroundColor: 'background.paper'
        }}
      >
        <Typography variant="h6" align="center">No analysis data available</Typography>
        <Typography variant="body2" align="center" color="text.secondary">
          Submit content for analysis to see results here
        </Typography>
      </Paper>
    );
  }

  const { 
    toxicityAnalysis, 
    geminiAnalysis,
    cyberbullyingScore,
    classification,
    originalText 
  } = analysisData;

  const getSeverityLevel = (score) => {
    if (score < 0.3) return { level: 'Low', color: 'success' };
    if (score < 0.7) return { level: 'Medium', color: 'warning' };
    return { level: 'High', color: 'error' };
  };

  const renderScoreBar = (label, score) => {
    const severity = getSeverityLevel(score);
    return (
      <Box sx={{ mb: 2 }}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography variant="body2">{label}</Typography>
          </Grid>
          <Grid item>
            <Chip 
              label={`${(score * 100).toFixed(1)}% - ${severity.level}`} 
              color={severity.color} 
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </Grid>
        </Grid>
        <LinearProgress 
          variant="determinate" 
          value={score * 100} 
          color={severity.color}
          sx={{ height: 8, borderRadius: 5, mt: 0.5 }}
        />
      </Box>
    );
  };

  const getOverallChip = () => {
    if (!classification) return null;
    
    const chipProps = {
      'Safe': { color: 'success', label: 'Safe Content' },
      'Potentially Harmful': { color: 'warning', label: 'Potentially Harmful' },
      'Harmful': { color: 'error', label: 'Harmful Content' }
    };
    
    const config = chipProps[classification] || { color: 'default', label: classification };
    
    return (
      <Chip 
        color={config.color} 
        label={config.label}
        sx={{ fontWeight: 'bold', mb: 2 }}
      />
    );
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        mt: 3, 
        maxWidth: 800, 
        mx: 'auto',
        backgroundColor: 'background.paper'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Content Analysis Results</Typography>
        {getOverallChip()}
      </Box>

      <Divider sx={{ mb: 2 }} />
      
      <Card variant="outlined" sx={{ mb: 3, backgroundColor: 'background.default' }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>Analyzed Content</Typography>
          <Typography variant="body2" color="text.secondary">
            {originalText || "No text available"}
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Toxicity Analysis */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ backgroundColor: 'background.default' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Toxicity Analysis</Typography>
              
              {toxicityAnalysis ? (
                <>
                  {renderScoreBar('Overall Toxicity', toxicityAnalysis.toxicity)}
                  {renderScoreBar('Severe Toxicity', toxicityAnalysis.severeToxicity)}
                  {renderScoreBar('Insult', toxicityAnalysis.insult)}
                  {renderScoreBar('Threat', toxicityAnalysis.threat)}
                  {renderScoreBar('Identity Attack', toxicityAnalysis.identityAttack)}
                  {renderScoreBar('Cyberbullying', cyberbullyingScore || 0)}
                </>
              ) : (
                <Typography color="text.secondary">Toxicity analysis not available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* LLM Analysis */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ backgroundColor: 'background.default' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Contextual Analysis</Typography>
              
              {geminiAnalysis ? (
                <Box sx={{ 
                  '& p': { my: 0.5 }, 
                  '& strong': { fontWeight: 'bold' },
                  '& h3': { fontSize: '1.1rem', fontWeight: 'bold', mt: 1.5, mb: 0.5 }
                }}>
                  <ReactMarkdown>
                    {geminiAnalysis}
                  </ReactMarkdown>
                </Box>
              ) : (
                <Typography color="text.secondary">Contextual analysis not available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {classification && classification !== 'Safe' && (
        <Alert 
          severity={classification === 'Harmful' ? 'error' : 'warning'} 
          sx={{ mt: 3 }}
        >
          <Typography variant="subtitle1">Recommended Action</Typography>
          <Typography variant="body2">
            {classification === 'Harmful' 
              ? 'This content violates community guidelines and should be removed.' 
              : 'This content may require further review by a human moderator.'}
          </Typography>
        </Alert>
      )}
    </Paper>
  );
};

export default ContentAnalysisResults;
