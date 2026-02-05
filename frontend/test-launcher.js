// Test script to verify the app launcher works
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001; // Use different port for testing

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('If you see this, the launcher setup is working correctly!');
  console.log('Press Ctrl+C to stop the test server.');
});
