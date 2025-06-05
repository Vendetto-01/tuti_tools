const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

// This module now exports a function that takes uploadedWavFiles as an argument
module.exports = function(uploadedWavFiles) {
  const router = express.Router();

  // Configure Multer for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Save to a general 'uploads' directory, not specific to tool1 anymore if it's a shared pool
      // Or keep it tool1 specific if uploads are only for this initial step.
      // For this refactor, let's assume uploads are still initiated by "Tool1" conceptually.
      const uploadPath = path.join(__dirname, '../../../uploads/tool1_wavs'); // New distinct folder
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Sanitize originalname for use in server filename
      // Replace spaces with underscores, then replace non-alphanumeric (excluding dot and hyphen) with underscore
      const sanitizedOriginalName = file.originalname
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${uuidv4()}-${sanitizedOriginalName}`);
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

  // POST route for just uploading WAV files
  router.post('/upload-wavs', upload.array('wavFiles', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded or invalid file type for all files.' });
    }

    const successfullyUploaded = [];

    req.files.forEach(file => {
      const fileData = {
        id: uuidv4(), // Generate a unique ID for each file
        originalName: file.originalname,
        serverFileName: file.filename,
        serverPath: file.path, // Full path to the uploaded file
        mimetype: file.mimetype,
        size: file.size,
        status: 'uploaded', // Initial status
        uploadTimestamp: new Date().toISOString(),
        convertedFileName: null,
        convertedFilePath: null,
        downloadUrl: null,
        conversionError: null,
      };
      uploadedWavFiles.push(fileData); // Add to the shared in-memory array
      successfullyUploaded.push({
        id: fileData.id,
        originalName: fileData.originalName,
        message: 'File uploaded successfully, pending conversion.'
      });
    });

    console.log(`${successfullyUploaded.length} WAV files uploaded and stored in memory array.`);
    console.log('Current uploadedWavFiles:', uploadedWavFiles); // For debugging

    res.status(201).json({
      message: `${successfullyUploaded.length} file(s) uploaded successfully.`,
      uploadedFiles: successfullyUploaded
    });
  });

  // Note: The FFmpeg setup and download endpoint are removed from here.
  // They will be part of tool2Routes.js

  return router;
};