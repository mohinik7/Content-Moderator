import React from "react";
import Dashboard from "./components/Dashboard";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Create a dark theme
const theme = createTheme({
  palette: {
    mode: 'dark', // Ensures dark mode
    primary: {
      main: '#BB86FC', // Purple accent
    },
    secondary: {
      main: '#03DAC6', // Teal accent
    },
    background: {
      default: '#121212', // Dark background
      paper: '#1E1E1E',   // Slightly lighter dark for paper
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B3B3B3',
    },
  },
  typography: {
    fontFamily: 'Inter, Roboto, sans-serif', // Modern font stack
    // You can customize font sizes if desired
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Dashboard />
    </ThemeProvider>
  );
}

export default App;


