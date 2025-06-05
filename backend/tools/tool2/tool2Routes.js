const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // For potential future use, though not strictly needed for rename

// This module exports a function that takes uploadedWavFiles as an argument
module.exports = function(uploadedWavFiles) {
  const router = express.Router();

  // GET route to list uploaded WAV files available for renaming
  // These are files typically in 'uploaded' status from Tool 1
  router.get('/list-original-wavs', (req, res) => {
    const filesToRename = uploadedWavFiles.filter(f => f.status === 'uploaded' && !f.originalName.endsWith('a.wav')); // Filter out already renamed ones if any
    res.json(filesToRename.map(f => ({
      id: f.id,
      originalName: f.originalName,
      serverFileName: f.serverFileName,
      size: f.size,
      uploadTimestamp: f.uploadTimestamp,
      status: f.status
    })));
  });

  // POST route to rename a selected file
  router.post('/rename-wav/:fileId', (req, res) => {
    const { fileId } = req.params;
    const fileIndex = uploadedWavFiles.findIndex(f => f.id === fileId);

    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found for renaming.' });
    }

    const fileData = uploadedWavFiles[fileIndex];

    if (fileData.status !== 'uploaded') {
      return res.status(400).json({ error: `File '${fileData.originalName}' is not in a state to be renamed (current status: ${fileData.status}).` });
    }

    const oldServerPath = fileData.serverPath;
    const oldServerFileName = fileData.serverFileName;

    const dirName = path.dirname(oldServerPath);
    const ext = path.extname(oldServerFileName);
    const baseNameWithoutExt = path.basename(oldServerFileName, ext);

    // New renaming logic: remove hyphen and subsequent characters from base name
    let newBaseNameFromRule = baseNameWithoutExt;
    const hyphenIndex = baseNameWithoutExt.indexOf('-');

    if (hyphenIndex !== -1) {
        newBaseNameFromRule = baseNameWithoutExt.substring(0, hyphenIndex);
    }

    // If the derived base name is the same as the original, no actual rename is needed.
    // This handles cases where no hyphen is found, or the name already conforms to the target pattern.
    if (newBaseNameFromRule === baseNameWithoutExt) {
      return res.status(200).json({
        message: `File '${oldServerFileName}' does not require renaming based on the new rule (no hyphen found or name already conforms).`,
        updatedFile: {
          id: fileData.id,
          originalName: fileData.originalName,
          serverFileName: fileData.serverFileName,
          status: fileData.status // Status remains 'uploaded', no rename occurred
        }
      });
    }

    // Proceed with rename using the new base name
    const newServerFileName = `${newBaseNameFromRule}${ext}`;
    const newServerPath = path.join(dirName, newServerFileName);

    // Check if a file with the new name already exists (optional, but good practice)
    if (fs.existsSync(newServerPath)) {
        // Attempt to avoid conflict by adding a unique suffix if '...a.wav' already exists
        // This is a simple conflict resolution. More robust might be needed.
        const uniqueSuffix = uuidv4().substring(0,4);
        const conflictResolvedBaseName = `${newBaseNameWithoutExt}_${uniqueSuffix}`;
        const conflictResolvedFileName = `${conflictResolvedBaseName}${ext}`;
        const conflictResolvedPath = path.join(dirName, conflictResolvedFileName);
        
        console.warn(`Rename conflict: ${newServerPath} already exists. Trying ${conflictResolvedPath}`);
        // For this example, we'll proceed with the uniquely suffixed name if the simple 'a' version exists.
        // However, the primary request is just to append 'a'. If strict adherence is needed,
        // this block should error out or have different logic.
        // For now, let's assume the user wants '...a.wav'. If that exists, it's an issue.
        // Let's simplify and assume the target '...a.wav' won't exist or we overwrite.
        // For safety, we should error if the direct target exists.
         return res.status(409).json({ error: `A file named '${newServerFileName}' already exists. Cannot rename.` });
    }
    
    try {
      fs.renameSync(oldServerPath, newServerPath);
      console.log(`File renamed: ${oldServerPath} -> ${newServerPath}`);

      // Update the fileData in the in-memory store
      fileData.serverFileName = newServerFileName;
      fileData.serverPath = newServerPath;
      fileData.status = 'renamed'; // New status
      fileData.renamedTimestamp = new Date().toISOString();
      // Keep originalName as is, to track its origin.
      // Or, update originalName if that's desired: fileData.originalName = newServerFileName; (less likely)

      uploadedWavFiles[fileIndex] = fileData; // Update the array

      res.json({
        message: `File '${oldServerFileName}' successfully renamed to '${newServerFileName}'.`,
        updatedFile: {
          id: fileData.id,
          originalName: fileData.originalName,
          serverFileName: fileData.serverFileName,
          status: fileData.status,
          renamedTimestamp: fileData.renamedTimestamp
        }
      });

    } catch (err) {
      console.error(`Error renaming file ${oldServerFileName} to ${newServerFileName}:`, err);
      return res.status(500).json({ error: 'Failed to rename file on the server.', details: err.message });
    }
  });

  return router;
};