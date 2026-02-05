const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Determine build path - when packaged, look relative to executable
const buildPath = process.pkg 
  ? path.join(path.dirname(process.execPath), 'build')
  : path.join(__dirname, 'build');

console.log('Looking for build directory at:', buildPath);

if (!fs.existsSync(buildPath)) {
  console.error('ERROR: Build directory not found!');
  console.error('Expected location:', buildPath);
  console.error('\nPlease copy the "build" folder to the same directory as this executable.');
  process.exit(1);
}

// Serve static files from build directory
app.use(express.static(buildPath));

// Handle SPA routing - serve index.html for all routes that didn't match static files
app.use((req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`F80 Frontend running on http://localhost:${PORT}`);
  
  // Open browser automatically
  const start = process.platform === 'darwin' ? 'open' : 
                process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${start} http://localhost:${PORT}`, (error) => {
    if (error) {
      console.log('Could not open browser automatically. Please open http://localhost:3000 in your browser.');
    } else {
      console.log('Browser opened automatically.');
    }
  });
});

// Keep the process alive and handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down F80 Frontend...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down F80 Frontend...');
  process.exit(0);
});

// Keep terminal open on error
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.log('Press any key to exit...');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', process.exit.bind(process, 0));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('Press any key to exit...');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', process.exit.bind(process, 0));
});

// Keep terminal open
setTimeout(() => {
  console.log('Press Ctrl+C to exit');
}, 1000);
