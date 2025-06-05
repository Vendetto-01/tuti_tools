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

  // POST route for "smart renaming" a file
  router.post('/smart-rename/:fileId', (req, res) => {
    const { fileId } = req.params;
    const fileIndex = uploadedWavFiles.findIndex(f => f.id === fileId && f.status === 'converted');

    if (fileIndex === -1) {
      return res.status(404).json({ error: 'Converted file not found or not in correct state.' });
    }

    const fileData = uploadedWavFiles[fileIndex];
    const currentConvertedName = fileData.convertedFileName;
    const currentConvertedPath = fileData.convertedFilePath;

    if (!currentConvertedName || !currentConvertedPath) {
      return res.status(400).json({ error: 'File data is incomplete for renaming.' });
    }

    const parts = path.parse(currentConvertedName);
    const nameWithoutExt = parts.name;
    const extension = parts.ext; // e.g., ".m4a"

    const lastDashIndex = nameWithoutExt.lastIndexOf('-');
    let newNameWithoutExt = nameWithoutExt;

    if (lastDashIndex !== -1) {
      // Check if the part after the last dash is purely numeric (or some other pattern you expect for "generated" parts)
      // For simplicity, we'll just truncate if a dash exists.
      // A more robust solution might check if `nameWithoutExt.substring(lastDashIndex + 1)` is numeric.
      newNameWithoutExt = nameWithoutExt.substring(0, lastDashIndex);
    }
    
    // If truncation results in an empty name, or no change, handle appropriately
    if (!newNameWithoutExt || newNameWithoutExt === nameWithoutExt) {
        return res.status(400).json({ error: 'No change in filename based on smart rename logic or name would be empty.' });
    }

    const newConvertedName = `${newNameWithoutExt}${extension}`;
    const newConvertedPath = path.join(path.dirname(currentConvertedPath), newConvertedName);

    if (fs.existsSync(newConvertedPath)) {
      return res.status(409).json({ error: `A file named ${newConvertedName} already exists. Cannot rename.` });
    }

    try {
      fs.renameSync(currentConvertedPath, newConvertedPath);
      console.log(`Renamed file from ${currentConvertedPath} to ${newConvertedPath}`);

      // Update in-memory store
      fileData.convertedFileName = newConvertedName;
      fileData.convertedFilePath = newConvertedPath;
      // Update download URL (assuming Tool2's download route can handle the new name)
      fileData.downloadUrl = `/api/tool2/download/${newConvertedName}`;
      // Add a timestamp for the rename action
      fileData.lastRenamedTimestamp = new Date().toISOString();


      res.json({
        message: `File successfully renamed to ${newConvertedName}`,
        updatedFile: {
          id: fileData.id,
          originalName: fileData.originalName,
          convertedFileName: fileData.convertedFileName,
          downloadUrl: fileData.downloadUrl
        }
      });
    } catch (err) {
      console.error(`Error renaming file ${currentConvertedName} to ${newConvertedName}:`, err);
      res.status(500).json({ error: 'Failed to rename file on server.', details: err.message });
    }
  });

  // Note: Download of converted files is still handled by Tool2's download route
  // as it knows the correct path in `converted/tool2_m4a`.
  // If Tool3 needed to initiate downloads directly, it would need access to that path logic.

  return router;
};