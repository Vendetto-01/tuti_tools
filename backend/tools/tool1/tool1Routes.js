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

// POST route for file upload and conversion
router.post('/convert-wav-to-m4a', upload.single('wavFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or invalid file type.' });
  }

  const inputFile = req.file.path;
  const outputFileName = `${path.parse(req.file.filename).name}.m4a`;
  const outputPath = path.join(__dirname, '../../../converted/tool1');
  const outputFile = path.join(outputPath, outputFileName);

  fs.mkdirSync(outputPath, { recursive: true }); // Ensure output directory exists

  ffmpeg(inputFile)
    .toFormat('m4a')
    .audioCodec('aac') // Common codec for M4A
    .on('end', () => {
      console.log('Conversion finished.');
      // Clean up the uploaded WAV file
      fs.unlink(inputFile, (err) => {
        if (err) console.error('Error deleting uploaded WAV file:', err);
      });
      res.json({
        message: 'File converted successfully!',
        downloadUrl: `/api/tool1/download/${outputFileName}`
      });
    })
    .on('error', (err) => {
      console.error('Error during conversion:', err.message);
      // Clean up the uploaded WAV file in case of error
      fs.unlink(inputFile, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting uploaded WAV file on conversion error:', unlinkErr);
      });
      res.status(500).json({ error: 'Error during file conversion.', details: err.message });
    })
    .save(outputFile);
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