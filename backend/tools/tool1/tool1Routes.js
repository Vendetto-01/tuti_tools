const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// This module now exports a function that takes uploadedWavFiles as an argument
module.exports = function(uploadedWavFiles) {
  const router = express.Router();

  // Configure Multer for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../../../uploads/tool1_wavs');
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Türkçe karakterleri düzgün şekilde handle et
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      // Dosya adını temizle - sadece güvenli karakterleri tut
      const sanitizedOriginalName = originalName
        .replace(/\s+/g, '_') // Boşlukları underscore ile değiştir
        .replace(/[^\w\-_.]/g, '') // Sadece harf, rakam, tire, underscore ve nokta bırak
        .substring(0, 100); // Maksimum 100 karakter
      
      // Unique ID ekle
      const uniqueId = uuidv4().substring(0, 8); // Kısa unique ID
      const timestamp = Date.now();
      
      cb(null, `${timestamp}-${uniqueId}-${sanitizedOriginalName}`);
    }
  });

  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      // MIME type kontrolü
      if (file.mimetype === 'audio/wav' || file.mimetype === 'audio/x-wav' || file.originalname.toLowerCase().endsWith('.wav')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only WAV files are allowed.'), false);
      }
    },
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB limit
    }
  });

  // POST route for just uploading WAV files
  router.post('/upload-wavs', upload.array('wavFiles', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded or invalid file type for all files.' });
    }

    const successfullyUploaded = [];

    req.files.forEach(file => {
      // Orijinal dosya adını düzgün şekilde decode et
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      const fileData = {
        id: uuidv4(),
        originalName: originalName, // Düzeltilmiş orijinal ad
        serverFileName: file.filename,
        serverPath: file.path,
        mimetype: file.mimetype,
        size: file.size,
        status: 'uploaded',
        uploadTimestamp: new Date().toISOString(),
        convertedFileName: null,
        convertedFilePath: null,
        downloadUrl: null,
        conversionError: null,
      };
      uploadedWavFiles.push(fileData);
      successfullyUploaded.push({
        id: fileData.id,
        originalName: fileData.originalName,
        message: 'File uploaded successfully, pending conversion.'
      });
    });

    console.log(`${successfullyUploaded.length} WAV files uploaded and stored in memory array.`);

    res.status(201).json({
      message: `${successfullyUploaded.length} file(s) uploaded successfully.`,
      uploadedFiles: successfullyUploaded
    });
  });

  return router;
};