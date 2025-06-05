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
    const filesToRename = uploadedWavFiles.filter(f => f.status === 'uploaded'); // Simplified filter
    res.json(filesToRename.map(f => ({
      id: f.id,
      originalName: f.trueOriginalName || f.originalName, // Prefer trueOriginalName for display
      serverFileName: f.serverFileName,
      size: f.size,
      uploadTimestamp: f.uploadTimestamp,
      status: f.status,
      // Optionally, include trueOriginalName explicitly if needed by frontend,
      // but mapping it to originalName here simplifies if frontend expects 'originalName'
      trueOriginalName: f.trueOriginalName
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
    const currentServerExt = path.extname(oldServerFileName); // Extension of the actual file on disk (e.g., .m4a)

    // Determine the target base name by applying the hyphen rule to fileData.trueOriginalName (or fallback to originalName)
    const nameToProcess = fileData.trueOriginalName || fileData.originalName;
    if (!nameToProcess) {
        // This case should ideally not happen if Tool1 always provides at least originalName
        console.error(`File ID ${fileData.id} is missing 'trueOriginalName' and 'originalName'.`);
        return res.status(400).json({ error: "File name information is missing to process rename." });
    }
    const originalFileOriginalExt = path.extname(nameToProcess);
    const originalBaseName = path.basename(nameToProcess, originalFileOriginalExt);

    let targetBaseName = originalBaseName; // Initialize with the full base name from (true)originalName
    const hyphenIndex = originalBaseName.indexOf('-');

    if (hyphenIndex !== -1) {
        targetBaseName = originalBaseName.substring(0, hyphenIndex); // e.g., "audioSüleymanÖzcan21973377903"
    }

    // Construct the full new target server filename using the derived targetBaseName and the actual currentServerExt
    const newTargetServerFileName = `${targetBaseName}${currentServerExt}`; // e.g., "audioSüleymanÖzcan21973377903.m4a"

    // If the newly constructed target server filename is identical to the current server filename,
    // then no physical rename operation is needed.
    if (newTargetServerFileName === oldServerFileName) {
      return res.status(200).json({
        message: `File '${oldServerFileName}' already matches the target naming convention derived from '${nameToProcess}'. No rename performed.`,
        updatedFile: {
          id: fileData.id,
          trueOriginalName: fileData.trueOriginalName,
          originalName: fileData.originalName,
          serverFileName: fileData.serverFileName,
          status: fileData.status,
          renamedTimestamp: fileData.renamedTimestamp
        }
      });
    }

    // Proceed with rename using the new target server filename
    const newServerFileName = newTargetServerFileName;
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
          trueOriginalName: fileData.trueOriginalName, // The actual original name
          originalName: fileData.originalName, // The name Tool1 might have initially set
          serverFileName: fileData.serverFileName, // The new name on disk
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