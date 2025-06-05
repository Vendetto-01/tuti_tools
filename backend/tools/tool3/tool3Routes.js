const express = require('express');
const path = require('path');
const fs = require('fs');

const sanitizeFilename = (name) => {
  if (typeof name !== 'string') return 'output_default'; // Return a default if name is not a string
  // Replace invalid Windows filename characters and control characters
  let sanitized = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  // Replace multiple underscores with a single one
  sanitized = sanitized.replace(/__+/g, '_');
  // Remove leading/trailing underscores, dots, or spaces
  sanitized = sanitized.replace(/^[_.\s]+|[_.\s]+$/g, '');
  // Handle cases where the name becomes empty or just dots
  if (sanitized === '' || sanitized === '.' || sanitized === '..') {
    sanitized = 'output'; // Or some other default like 'processed_file'
  }
  // Trim to a reasonable length (e.g., 100 chars for the name part)
  const maxLength = 100;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    // Re-check for trailing dots/spaces after substring and ensure not empty
    sanitized = sanitized.replace(/[_.\s]+$/g, '');
    if (sanitized === '' || sanitized === '.' || sanitized === '..') {
        sanitized = 'output_trimmed';
    }
  }
  return sanitized;
};

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
    
    const sanitizedNewNameWithoutExt = sanitizeFilename(newNameWithoutExt);

    // If sanitization results in an empty name, or no change where one was expected, handle appropriately
    if (!sanitizedNewNameWithoutExt || (newNameWithoutExt !== nameWithoutExt && sanitizedNewNameWithoutExt === nameWithoutExt) ) {
        // If original was not changed by smart logic, but sanitization made it same as original, it's fine.
        // But if smart logic DID change it, and THEN sanitization made it empty or reverted it, that's an issue.
        // The check `newNameWithoutExt !== nameWithoutExt` ensures we only error if smart logic *intended* a change.
        if (newNameWithoutExt !== nameWithoutExt && (sanitizedNewNameWithoutExt === '' || sanitizedNewNameWithoutExt === nameWithoutExt)) {
             return res.status(400).json({ error: 'Filename becomes invalid or unchanged after sanitization during smart rename.' });
        }
    }
    // Ensure the name is not empty after sanitization if it was supposed to be changed
    if (newNameWithoutExt !== nameWithoutExt && !sanitizedNewNameWithoutExt) {
        return res.status(400).json({ error: 'Filename becomes empty after sanitization during smart rename.' });
    }


    const newConvertedName = `${sanitizedNewNameWithoutExt || nameWithoutExt}${extension}`; // Fallback to original name if sanitized is empty
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