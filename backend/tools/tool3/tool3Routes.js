const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// This module exports a function that takes uploadedWavFiles as an argument
module.exports = function(uploadedWavFiles) {
  const router = express.Router();

  // Ensure FFmpeg path is set to the locally downloaded binaries
  const ffmpegPath = path.join(__dirname, '../../bin/ffmpeg');
  const ffprobePath = path.join(__dirname, '../../bin/ffprobe');

  if (fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    console.log(`FFmpeg binary found at: ${ffmpegPath}`);
  } else {
    console.warn(`FFmpeg binary not found at ${ffmpegPath} (Tool3 - formerly Tool2). Conversion might fail if not in system PATH.`);
  }

  if (fs.existsSync(ffprobePath)) {
    ffmpeg.setFfprobePath(ffprobePath);
    console.log(`FFprobe binary found at: ${ffprobePath}`);
  } else {
    console.warn(`ffprobe binary not found at ${ffprobePath} (Tool3 - formerly Tool2). Some operations might fail if not in system PATH.`);
  }

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

  // GET route to list uploaded WAV files (this will be adapted to list RENAMED files)
  router.get('/list-renamed-wavs', (req, res) => { // Endpoint name changed
    // Filter for files that have been specifically renamed by Tool 2,
    // or files that were renamed and then subsequently converted by this tool (Tool 3).
    const filesToList = uploadedWavFiles.filter(f => f.status === 'renamed' || f.m4aConvertedFileName); // Shows renamed files, and those renamed then converted by Tool3
    res.json(filesToList.map(f => ({
      id: f.id,
      originalName: f.originalName,
      serverFileName: f.serverFileName,
      size: f.size,
      uploadTimestamp: f.uploadTimestamp,
      status: f.status, // Current status (could be 'renamed', or some 'converted' status if M4A conversion happened here)
      renamedTimestamp: f.renamedTimestamp,
      m4aConvertedFileName: f.m4aConvertedFileName, // If converted by this tool
      m4aDownloadUrl: f.m4aDownloadUrl // If converted by this tool
    })));
  });

  // POST route for converting selected files (This might be removed or adapted for Tool 3 if needed)
  // For now, we keep it but it might not be directly used by the new Tool 3 frontend
  router.post('/convert-selected-to-m4a', async (req, res) => {
    const { fileIds } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'No file IDs provided for conversion.' });
    }

    const conversionResults = [];
    const conversionPromises = [];

    for (const id of fileIds) {
      // We need to find files that could be original or already renamed
      const fileData = uploadedWavFiles.find(f => f.id === id && (f.status === 'uploaded' || f.status === 'renamed'));

      if (!fileData) {
        conversionResults.push({
          id: id,
          originalName: `Unknown (ID: ${id})`,
          status: 'error',
          error: 'File not found, already processed, or not in a convertible state.'
        });
        continue;
      }

      const inputFile = fileData.serverPath; // This should be the path to the (potentially renamed) WAV
      // The base name for the output M4A should be derived from the *current* serverFileName
      const originalBaseName = path.parse(fileData.serverFileName).name;
      const sanitizedBaseName = sanitizeFilename(originalBaseName);
      const outputFileName = `${sanitizedBaseName}.m4a`;
      
      const outputPath = path.resolve(__dirname, '../../converted/tool3_m4a'); // Changed path
      const outputFile = path.resolve(outputPath, outputFileName);

      try {
        fs.mkdirSync(outputPath, { recursive: true });
        console.log(`Output directory ensured for Tool 3: ${outputPath}`);
      } catch (error) {
        console.error('Error creating output directory (Tool 3):', error);
        conversionResults.push({
          id: fileData.id,
          originalName: fileData.originalName,
          status: 'error',
          error: 'Failed to create output directory',
          details: error.message
        });
        continue;
      }

      const promise = new Promise((resolve) => {
        console.log(`Starting M4A conversion for (Tool3): ${fileData.originalName} (Server: ${fileData.serverFileName})`);
        console.log(`Input file (Tool3): ${inputFile}`);
        console.log(`Output file (Tool3): ${outputFile}`);
        
        if (!fs.existsSync(inputFile)) {
          console.error(`Input file does not exist (Tool3): ${inputFile}`);
          conversionResults.push({
            id: fileData.id,
            originalName: fileData.originalName,
            status: 'error',
            error: 'Input file not found for M4A conversion'
          });
          resolve();
          return;
        }

        ffmpeg(inputFile)
          .format('mp4')
          .audioCodec('aac')
          .audioBitrate('128k')
          .audioChannels(2)
          .audioFrequency(44100)
          .outputOptions([
            '-movflags', 'faststart',
            '-f', 'mp4'
          ])
          .on('start', (commandLine) => {
            console.log('FFmpeg command (Tool3): ' + commandLine);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log(`Processing M4A (Tool3) ${fileData.originalName}: ${progress.percent.toFixed(2)}% done`);
            }
          })
          .on('end', () => {
            console.log(`M4A conversion finished for (Tool3): ${fileData.originalName}`);
            
            if (fs.existsSync(outputFile)) {
              // Update fileData for M4A conversion
              // Note: A file can be renamed AND then converted.
              fileData.m4aConvertedFileName = outputFileName; // New field
              fileData.m4aConvertedFilePath = outputFile;   // New field
              fileData.m4aDownloadUrl = `/api/tool3/download/${outputFileName}`; // New field
              fileData.m4aConversionError = null;         // New field
              // We might need a new status like 'renamed_and_converted'
              // For now, let's assume 'converted' implies it might have been renamed first.
              // Or, we can add a specific status if needed.
              // fileData.status = 'converted_m4a'; // Or similar

              conversionResults.push({
                id: fileData.id,
                originalName: fileData.originalName, // Show original name for clarity
                currentServerName: fileData.serverFileName, // Show current name
                status: 'success',
                message: 'File converted successfully to M4A!',
                downloadUrl: fileData.m4aDownloadUrl
              });
            } else {
              console.error(`Output M4A file was not created (Tool3): ${outputFile}`);
              conversionResults.push({
                id: fileData.id,
                originalName: fileData.originalName,
                status: 'error',
                error: 'Output M4A file was not created'
              });
            }
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error during M4A conversion for (Tool3) ${fileData.originalName}:`, err);
            fileData.m4aConversionError = err.message;
            conversionResults.push({
              id: fileData.id,
              originalName: fileData.originalName,
              status: 'error',
              error: 'Error during M4A file conversion.',
              details: err.message
            });
            resolve();
          })
          .save(outputFile);
      });
      conversionPromises.push(promise);
    }

    await Promise.all(conversionPromises);
    console.log('All selected M4A conversions attempted for Tool 3.');
    res.json(conversionResults);
  });

  // GET route for downloading the converted M4A file (from Tool3)
  router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    // Path now points to tool3_m4a directory
    const filePath = path.resolve(__dirname, '../../converted/tool3_m4a', filename);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'audio/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Error downloading M4A file (Tool3):', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error downloading file' });
          }
        }
      });
    } else {
      console.log(`M4A file not found at path (Tool3): ${filePath}`);
      res.status(404).json({ error: 'M4A file not found (Tool3).' });
    }
  });

  // DELETE route for removing an uploaded WAV file (and its conversions)
  // This needs to handle original, renamed, and M4A converted files
  router.delete('/delete-file/:fileId', (req, res) => {
    const { fileId } = req.params;
    const fileIndex = uploadedWavFiles.findIndex(f => f.id === fileId);

    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found in the list.' });
    }

    const fileData = uploadedWavFiles[fileIndex];
    const originalNameForLog = fileData.originalName;

    // Attempt to delete the original/renamed WAV file on server
    if (fileData.serverPath && fs.existsSync(fileData.serverPath)) {
      try {
        fs.unlinkSync(fileData.serverPath);
        console.log(`Deleted WAV file from server: ${fileData.serverPath}`);
      } catch (err) {
        console.error(`Error deleting WAV file ${fileData.serverPath}:`, err);
      }
    }

    // Attempt to delete the M4A converted file if it exists
    if (fileData.m4aConvertedFilePath && fs.existsSync(fileData.m4aConvertedFilePath)) {
      try {
        fs.unlinkSync(fileData.m4aConvertedFilePath);
        console.log(`Deleted converted M4A file: ${fileData.m4aConvertedFilePath}`);
      } catch (err) {
        console.error(`Error deleting converted M4A file ${fileData.m4aConvertedFilePath}:`, err);
      }
    }

    uploadedWavFiles.splice(fileIndex, 1);
    console.log(`Removed file ID ${fileId} (${originalNameForLog}) from in-memory list. Remaining files:`, uploadedWavFiles.length);

    res.json({ message: `File ${originalNameForLog} and its potential M4A conversion have been processed for deletion.` });
  });

  return router;
};