const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure FFmpeg path is set to the locally downloaded binaries
const ffmpegPath = path.join(__dirname, '../../bin/ffmpeg');
const ffprobePath = path.join(__dirname, '../../bin/ffprobe');

if (fs.existsSync(ffmpegPath)) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  console.warn(`FFmpeg binary not found at ${ffmpegPath}. Conversion might fail if not in system PATH.`);
}

if (fs.existsSync(ffprobePath)) {
  ffmpeg.setFfprobePath(ffprobePath);
} else {
  console.warn(`ffprobe binary not found at ${ffprobePath}. Some operations might fail if not in system PATH.`);
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/tool1');
    fs.mkdirSync(uploadPath, { recursive: true }); // Ensure directory exists
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/wav' || file.mimetype === 'audio/x-wav') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only WAV files are allowed.'), false);
    }
  }
});

// POST route for file upload and conversion - now handles multiple files
router.post('/convert-wav-to-m4a', upload.array('wavFiles', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded or invalid file type for all files.' });
  }

  const results = [];
  const filesToProcess = req.files;

  for (const file of filesToProcess) {
    const originalName = file.originalname;
    const inputFile = file.path;
    const outputFileName = `${path.parse(file.filename).name}.m4a`;
    const outputPath = path.join(__dirname, '../../../converted/tool1');
    const outputFile = path.join(outputPath, outputFileName);

    fs.mkdirSync(outputPath, { recursive: true }); // Ensure output directory exists

    try {
      await new Promise((resolve, reject) => {
        console.log(`Starting conversion for: ${originalName}`);
        ffmpeg(inputFile)
          .toFormat('m4a')
          .audioCodec('aac') // Common codec for M4A
          .on('progress', (progress) => {
            // Log progress - in a future phase, this could be sent via WebSockets/SSE
            if (progress.percent) {
              console.log(`Processing ${originalName}: ${progress.percent.toFixed(2)}% done`);
            } else if (progress.timemark) {
              console.log(`Processing ${originalName}: timemark ${progress.timemark}`);
            }
          })
          .on('end', () => {
            console.log(`Conversion finished for: ${originalName}`);
            fs.unlink(inputFile, (err) => { // Clean up uploaded WAV
              if (err) console.error(`Error deleting uploaded WAV file ${inputFile}:`, err);
            });
            results.push({
              originalName: originalName,
              status: 'success',
              message: 'File converted successfully!',
              downloadUrl: `/api/tool1/download/${outputFileName}`
            });
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error during conversion for ${originalName}:`, err.message);
            fs.unlink(inputFile, (unlinkErr) => { // Clean up uploaded WAV on error
              if (unlinkErr) console.error(`Error deleting uploaded WAV file ${inputFile} on conversion error:`, unlinkErr);
            });
            results.push({
              originalName: originalName,
              status: 'error',
              error: 'Error during file conversion.',
              details: err.message
            });
            reject(err); // Reject promise to stop further processing for this file if needed, or resolve to continue with others
          })
          .save(outputFile);
      });
    } catch (error) {
      // Error already pushed to results, just log that we are continuing if processing multiple files
      console.log(`An error occurred with ${originalName}, continuing with next files if any.`);
    }
  }

  res.json(results); // Send back array of results
});

// GET route for downloading the converted file
router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../../../converted/tool1', filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        // It's good practice to try and clean up if download fails mid-way
        // but be cautious with auto-deleting files that might be needed for retry.
      } else {
        // Optionally, delete the file after successful download
        // fs.unlink(filePath, (unlinkErr) => {
        //   if (unlinkErr) console.error('Error deleting converted file after download:', unlinkErr);
        // });
      }
    });
  } else {
    res.status(404).json({ error: 'File not found.' });
  }
});

module.exports = router;