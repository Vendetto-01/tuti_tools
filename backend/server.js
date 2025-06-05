const express = require('express');
const path = require('path');
const fs = require('fs'); // Added fs require
const cors = require('cors'); // Import cors

// In-memory store for uploaded WAV file metadata
// For production, consider a more persistent store (e.g., database, file system db)
const uploadedWavFiles = [];

const tool1Routes = require('./tools/tool1/tool1Routes')(uploadedWavFiles); // Pass shared array
const tool2Routes = require('./tools/tool2/tool2Routes')(uploadedWavFiles); // Pass shared array
const tool3Routes = require('./tools/tool3/tool3Routes')(uploadedWavFiles); // Pass shared array for Tool3

const app = express();
const port = process.env.PORT || 3001; // Backend server port

// Middleware for parsing JSON bodies (if you need to send JSON to backend)
app.use(express.json());
// Middleware for parsing URL-encoded bodies (if forms submit directly to backend)
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
const allowedOrigins = ['https://tuti-tools.onrender.com'];
if (process.env.NODE_ENV !== 'production') {
  // Allow localhost for development
  allowedOrigins.push('http://localhost:3000'); // Assuming frontend runs on 3000 locally
}

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));


// API Routes (should come before static serving and catch-all)
app.use('/api/tool1', tool1Routes); // Use Tool1 routes
app.use('/api/tool2', tool2Routes); // Mount Tool2 routes
app.use('/api/tool3', tool3Routes); // Mount Tool3 routes

// API endpoint example
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// Serve static files and catch-all for React app ONLY in development
if (process.env.NODE_ENV !== 'production') {
  console.log('Development mode: Serving static frontend files from backend.');
  // Serve static files from the React frontend app
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  // All other GET requests not handled before will return the React app
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../frontend/build/index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend build not found. Run `npm run build` in the frontend directory.');
    }
  });
} else {
  // In production, the frontend is served by its own static site service.
  // The backend only serves API routes.
  // A simple health check or root route for the API can be useful.
  app.get('/', (req, res) => {
    res.send('Tuti Tools API is running.');
  });
}


app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port} in ${process.env.NODE_ENV || 'development'} mode`);
});