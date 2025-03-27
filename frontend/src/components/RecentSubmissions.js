import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Chip,
  Paper,
  Divider,
  Box,
  CircularProgress
} from '@mui/material';
import { 
  Description as FileIcon,
  Chat as TextIcon,
  CheckCircle as SafeIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

const RecentSubmissions = ({ submissions, loading, onSelectSubmission }) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" align="center">
          No recent submissions found
        </Typography>
      </Paper>
    );
  }

  // Helper function to render the appropriate icon for classification
  const getClassificationIcon = (classification) => {
    switch (classification) {
      case 'Safe':
        return <SafeIcon fontSize="small" color="success" />;
      case 'Potentially Harmful':
        return <WarningIcon fontSize="small" color="warning" />;
      case 'Harmful':
        return <ErrorIcon fontSize="small" color="error" />;
      default:
        return null;
    }
  };

  // Helper function to format date
  const formatDate = (date) => {
    if (!date) return 'Unknown date';
    return new Date(date).toLocaleString();
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Submissions
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <List disablePadding>
          {submissions.map((submission, index) => (
            <React.Fragment key={submission.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem 
                alignItems="flex-start" 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
                onClick={() => onSelectSubmission(submission.id)}
              >
                <ListItemIcon>
                  {submission.type === 'file' ? <FileIcon /> : <TextIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1">
                        {submission.type === 'file' 
                          ? submission.fileName || 'Unnamed file' 
                          : submission.textPreview || 'Text submission'
                        }
                      </Typography>
                      {getClassificationIcon(submission.classification)}
                    </Box>
                  }
                  secondary={
                    <Box display="flex" alignItems="center" justifyContent="space-between" mt={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(submission.createdAt)}
                      </Typography>
                      <Chip 
                        label={submission.classification || 'Unclassified'} 
                        size="small"
                        color={
                          submission.classification === 'Safe' ? 'success' :
                          submission.classification === 'Potentially Harmful' ? 'warning' :
                          submission.classification === 'Harmful' ? 'error' : 'default'
                        }
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default RecentSubmissions; 