// Environment configuration for F80 Demo
// This file sets up the environment variables for the frontend

const fs = require('fs');
const path = require('path');

const envContent = `VITE_API_BASE_URL=http://192.168.137.100:8000
VITE_CAMERA_URL=http://192.168.137.100:8001
`;

const envPath = path.join(__dirname, '.env');

try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Environment file created successfully');
    console.log('📁 Location:', envPath);
} catch (error) {
    console.error('❌ Error creating environment file:', error);
} 