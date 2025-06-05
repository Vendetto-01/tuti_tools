const express = require('express');
const path = require('path');
const cors = require('cors'); // Import cors

// In-memory store for uploaded WAV file metadata
// For production, consider a more persistent store (e.g., database, file system db)
const uploadedWavFiles = [];

const tool1Routes = require('./tools/tool1/tool1Routes')(uploadedWavFiles); // Pass shared array
const tool2Routes = require('./tools/tool2/tool2Routes')(uploadedWavFiles); // Pass shared array

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


// Serve static files from the React frontend app
// This should ideally be placed after API routes if your API might have conflicting paths
// or if you want API routes to take precedence.
// For now, keeping it here is fine for typical CRA setups.
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API Routes
app.use('/api/tool1', tool1Routes); // Use Tool1 routes
app.use('/api/tool2', tool2Routes); // Mount Tool2 routes

// API endpoint example
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// All other GET requests not handled before will return the React app
// This should be the LAST route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});