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
  } else {
    console.warn(`FFmpeg binary not found at ${ffmpegPath} (Tool2). Conversion might fail if not in system PATH.`);
  }

  if (fs.existsSync(ffprobePath)) {
    ffmpeg.setFfprobePath(ffprobePath);
  } else {
    console.warn(`ffprobe binary not found at ${ffprobePath} (Tool2). Some operations might fail if not in system PATH.`);
  }

  // GET route to list uploaded WAV files ready for conversion
  router.get('/list-uploaded-wavs', (req, res) => {
    const filesToConvert = uploadedWavFiles.filter(f => f.status === 'uploaded');
    res.json(filesToConvert.map(f => ({ // Send only necessary info to client
      id: f.id,
      originalName: f.originalName,
      size: f.size,
      uploadTimestamp: f.uploadTimestamp
    })));
  });

  // POST route for converting selected files
  router.post('/convert-selected-to-m4a', async (req, res) => {
    const { fileIds } = req.body; // Expecting an array of file IDs

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'No file IDs provided for conversion.' });
    }

    const conversionResults = [];
    const conversionPromises = [];

    for (const id of fileIds) {
      const fileData = uploadedWavFiles.find(f => f.id === id && f.status === 'uploaded');

      if (!fileData) {
        conversionResults.push({ id: id, originalName: `Unknown (ID: ${id})`, status: 'error', error: 'File not found or already processed.' });
        continue;
      }

      const inputFile = fileData.serverPath;
      // Use a consistent naming scheme for converted files, perhaps based on original name + id
      const outputFileName = `${path.parse(fileData.serverFileName).name}.m4a`;
      const outputPath = path.join(__dirname, '../../../converted/tool2_m4a'); // New distinct folder
      const outputFile = path.join(outputPath, outputFileName);

      fs.mkdirSync(outputPath, { recursive: true });

      const promise = new Promise((resolve) => {
        console.log(`Starting conversion for (Tool2): ${fileData.originalName}`);
        ffmpeg(inputFile)
          .toFormat('m4a')
          .audioCodec('aac') // Re-enabled AAC codec
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log(`Processing (Tool2) ${fileData.originalName}: ${progress.percent.toFixed(2)}% done`);
            }
          })
          .on('end', () => {
            console.log(`Conversion finished for (Tool2): ${fileData.originalName}`);
            // Update fileData in the shared array
            fileData.status = 'converted';
            fileData.convertedFileName = outputFileName;
            fileData.convertedFilePath = outputFile;
            fileData.downloadUrl = `/api/tool2/download/${outputFileName}`; // Tool2 download route
            fileData.conversionError = null;
            
            // Original uploaded WAV is NOT deleted here, as it might be needed if conversion is retried
            // or if the user wants to convert to other formats later. Deletion policy can be added.

            conversionResults.push({
              id: fileData.id,
              originalName: fileData.originalName,
              status: 'success',
              message: 'File converted successfully!',
              downloadUrl: fileData.downloadUrl
            });
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error during conversion for (Tool2) ${fileData.originalName}:`, err.message);
            fileData.status = 'conversion_failed';
            fileData.conversionError = err.message;
            conversionResults.push({
              id: fileData.id,
              originalName: fileData.originalName,
              status: 'error',
              error: 'Error during file conversion.',
              details: err.message
            });
            resolve(); // Resolve even on error to process all selected files
          })
          .save(outputFile);
      });
      conversionPromises.push(promise);
    }

    await Promise.all(conversionPromises); // Wait for all selected files to be processed
    console.log('All selected conversions attempted. Current uploadedWavFiles:', uploadedWavFiles);
    res.json(conversionResults);
  });

  // GET route for downloading the converted file (from Tool2)
  router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    // Ensure this path matches where Tool2 saves its converted files
    const filePath = path.join(__dirname, '../../../converted/tool2_m4a', filename);

    if (fs.existsSync(filePath)) {
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Error downloading file (Tool2):', err);
        }
        // Optional: Delete after download, or implement a cleanup strategy
      });
    } else {
      res.status(404).json({ error: 'File not found (Tool2).' });
    }
  });

  // DELETE route for removing an uploaded WAV file (and its conversion if exists)
  router.delete('/delete-wav/:fileId', (req, res) => {
    const { fileId } = req.params;
    const fileIndex = uploadedWavFiles.findIndex(f => f.id === fileId);

    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found in the list.' });
    }

    const fileData = uploadedWavFiles[fileIndex];
    let originalFileDeleted = false;
    let convertedFileDeleted = false;

    // Attempt to delete the original uploaded file
    if (fileData.serverPath && fs.existsSync(fileData.serverPath)) {
      try {
        fs.unlinkSync(fileData.serverPath);
        console.log(`Deleted original uploaded file: ${fileData.serverPath}`);
        originalFileDeleted = true;
      } catch (err) {
        console.error(`Error deleting original file ${fileData.serverPath}:`, err);
        // Continue, as we still want to remove it from the list
      }
    } else {
      console.log(`Original file path not found or already deleted: ${fileData.serverPath}`);
      originalFileDeleted = true; // Consider it "deleted" if not found
    }

    // Attempt to delete the converted file if it exists
    if (fileData.convertedFilePath && fs.existsSync(fileData.convertedFilePath)) {
      try {
        fs.unlinkSync(fileData.convertedFilePath);
        console.log(`Deleted converted file: ${fileData.convertedFilePath}`);
        convertedFileDeleted = true;
      } catch (err) {
        console.error(`Error deleting converted file ${fileData.convertedFilePath}:`, err);
      }
    } else if (fileData.status === 'converted') { // If status is converted but path is missing
      console.log(`Converted file path not found or already deleted: ${fileData.convertedFilePath}`);
      convertedFileDeleted = true; // Consider it "deleted"
    }


    // Remove from the in-memory array
    uploadedWavFiles.splice(fileIndex, 1);
    console.log(`Removed file ID ${fileId} from in-memory list. Remaining files:`, uploadedWavFiles.length);

    res.json({ message: `File ${fileData.originalName} and its potential conversion have been processed for deletion.` });
  });

  return router;
};