const express = require('express');
const path = require('path');
const tool1Routes = require('./tools/tool1/tool1Routes'); // Import Tool1 routes

const app = express();
const port = process.env.PORT || 3001; // Backend server port

// Middleware for parsing JSON bodies (if you need to send JSON to backend)
app.use(express.json());
// Middleware for parsing URL-encoded bodies (if forms submit directly to backend)
app.use(express.urlencoded({ extended: true }));


// Serve static files from the React frontend app
// This should ideally be placed after API routes if your API might have conflicting paths
// or if you want API routes to take precedence.
// For now, keeping it here is fine for typical CRA setups.
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API Routes
app.use('/api/tool1', tool1Routes); // Use Tool1 routes

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