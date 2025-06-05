const express = require('express');
const path = require('path');
const fs = require('fs');

// This module exports a function that takes uploadedWavFiles as an argument
module.exports = function(uploadedWavFiles) {
  const router = express.Router();

  // GET route to list successfully converted files
  router.get('/list-converted-files', (req, res) => {
    const convertedFiles = uploadedWavFiles.filter(f => f.status === 'converted');
    res.json(convertedFiles.map(f => ({
      id: f.id,
      originalName: f.originalName,
      convertedFileName: f.convertedFileName,
      downloadUrl: f.downloadUrl, // This is already the API path for download from Tool2
      uploadTimestamp: f.uploadTimestamp,
      // We might add a conversionTimestamp later if needed
    })));
  });

  // Placeholder for future rename functionality
  // router.post('/rename-file/:fileId', (req, res) => {
  //   const { fileId } = req.params;
  //   const { newName } = req.body; // Expecting newName without extension
  //   // Logic to find file, rename physical file, update in-memory store
  //   // and handle potential name collisions or invalid characters.
  //   res.status(501).json({ message: 'Rename functionality not yet implemented.' });
  // });

  // Note: Download of converted files is still handled by Tool2's download route
  // as it knows the correct path in `converted/tool2_m4a`.
  // If Tool3 needed to initiate downloads directly, it would need access to that path logic.

  return router;
};