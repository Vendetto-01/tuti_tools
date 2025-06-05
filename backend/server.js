const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

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

// Middleware to set default Content-Type for JSON responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// API Routes (should come before static serving and catch-all)
app.use('/api/tool1', tool1Routes); // Use Tool1 routes
app.use('/api/tool2', tool2Routes); // Mount Tool2 routes
app.use('/api/tool3', tool3Routes); // Mount Tool3 routes

// API endpoint example
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// FFmpeg test endpoint - sadece geliştirme/test için
app.get('/api/test-ffmpeg', (req, res) => {
  const ffmpeg = require('fluent-ffmpeg');
  const { spawn } = require('child_process');

  // FFmpeg binary path'ini kontrol et
  const ffmpegPath = path.join(__dirname, 'bin/ffmpeg');
  
  let ffmpegInfo = {
    binaryExists: fs.existsSync(ffmpegPath),
    binaryPath: ffmpegPath,
    systemFFmpeg: false,
    formats: [],
    codecs: [],
    error: null,
    environment: process.env.NODE_ENV || 'development'
  };

  // Sistem FFmpeg'ini kontrol et
  const testSystemFFmpeg = spawn('ffmpeg', ['-version'], { stdio: 'pipe' });
  
  testSystemFFmpeg.on('close', (code) => {
    if (code === 0) {
      ffmpegInfo.systemFFmpeg = true;
    }
    
    // FFmpeg formatlarını kontrol et
    const ffmpegBinary = ffmpegInfo.binaryExists ? ffmpegPath : 'ffmpeg';
    const formatProcess = spawn(ffmpegBinary, ['-formats'], { stdio: 'pipe' });
    let formatOutput = '';
    
    formatProcess.stdout.on('data', (data) => {
      formatOutput += data.toString();
    });
    
    formatProcess.stderr.on('data', (data) => {
      formatOutput += data.toString();
    });
    
    formatProcess.on('close', (formatCode) => {
      if (formatCode === 0) {
        // M4A ve MP4 formatlarını ara
        const lines = formatOutput.split('\n');
        lines.forEach(line => {
          if (line.includes('m4a') || line.includes('mp4') || line.includes('ipod') || line.includes('mp4')) {
            ffmpegInfo.formats.push(line.trim());
          }
        });
      }
      
      // Codec'leri kontrol et
      const codecProcess = spawn(ffmpegBinary, ['-codecs'], { stdio: 'pipe' });
      let codecOutput = '';
      
      codecProcess.stdout.on('data', (data) => {
        codecOutput += data.toString();
      });
      
      codecProcess.stderr.on('data', (data) => {
        codecOutput += data.toString();
      });
      
      codecProcess.on('close', (codecCode) => {
        if (codecCode === 0) {
          const lines = codecOutput.split('\n');
          lines.forEach(line => {
            if (line.toLowerCase().includes('aac')) {
              ffmpegInfo.codecs.push(line.trim());
            }
          });
        }
        
        res.json(ffmpegInfo);
      });
      
      codecProcess.on('error', (err) => {
        ffmpegInfo.error = `Codec check failed: ${err.message}`;
        res.json(ffmpegInfo);
      });
    });
    
    formatProcess.on('error', (err) => {
      ffmpegInfo.error = `Format check failed: ${err.message}`;
      res.json(ffmpegInfo);
    });
  });
  
  testSystemFFmpeg.on('error', (err) => {
    // Sistem FFmpeg yok, sadece local binary ile devam et
    ffmpegInfo.systemFFmpeg = false;
    
    if (!ffmpegInfo.binaryExists) {
      ffmpegInfo.error = 'No FFmpeg binary found';
      return res.json(ffmpegInfo);
    }
    
    // Local binary ile format kontrolü yap
    const formatProcess = spawn(ffmpegPath, ['-formats'], { stdio: 'pipe' });
    let formatOutput = '';
    
    formatProcess.stdout.on('data', (data) => {
      formatOutput += data.toString();
    });
    
    formatProcess.stderr.on('data', (data) => {
      formatOutput += data.toString();
    });
    
    formatProcess.on('close', (formatCode) => {
      if (formatCode === 0) {
        const lines = formatOutput.split('\n');
        lines.forEach(line => {
          if (line.includes('m4a') || line.includes('mp4') || line.includes('ipod')) {
            ffmpegInfo.formats.push(line.trim());
          }
        });
      }
      
      // Codec kontrolü de ekle
      const codecProcess = spawn(ffmpegPath, ['-codecs'], { stdio: 'pipe' });
      let codecOutput = '';
      
      codecProcess.stdout.on('data', (data) => {
        codecOutput += data.toString();
      });
      
      codecProcess.stderr.on('data', (data) => {
        codecOutput += data.toString();
      });
      
      codecProcess.on('close', (codecCode) => {
        if (codecCode === 0) {
          const lines = codecOutput.split('\n');
          lines.forEach(line => {
            if (line.toLowerCase().includes('aac')) {
              ffmpegInfo.codecs.push(line.trim());
            }
          });
        }
        res.json(ffmpegInfo);
      });
      
      codecProcess.on('error', (err) => {
        ffmpegInfo.error = `Local codec check failed: ${err.message}`;
        res.json(ffmpegInfo);
      });
    });
    
    formatProcess.on('error', (err) => {
      ffmpegInfo.error = `Local FFmpeg test failed: ${err.message}`;
      res.json(ffmpegInfo);
    });
  });
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