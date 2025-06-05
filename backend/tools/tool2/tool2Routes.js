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
    console.warn(`FFmpeg binary not found at ${ffmpegPath} (Tool2). Conversion might fail if not in system PATH.`);
  }

  if (fs.existsSync(ffprobePath)) {
    ffmpeg.setFfprobePath(ffprobePath);
    console.log(`FFprobe binary found at: ${ffprobePath}`);
  } else {
    console.warn(`ffprobe binary not found at ${ffprobePath} (Tool2). Some operations might fail if not in system PATH.`);
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

  // GET route to list uploaded WAV files ready for conversion
  router.get('/list-uploaded-wavs', (req, res) => {
    const filesToConvert = uploadedWavFiles.filter(f => f.status === 'uploaded');
    res.json(filesToConvert.map(f => ({
      id: f.id,
      originalName: f.originalName,
      size: f.size,
      uploadTimestamp: f.uploadTimestamp
    })));
  });

  // POST route for converting selected files
  router.post('/convert-selected-to-m4a', async (req, res) => {
    const { fileIds } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'No file IDs provided for conversion.' });
    }

    const conversionResults = [];
    const conversionPromises = [];

    for (const id of fileIds) {
      const fileData = uploadedWavFiles.find(f => f.id === id && f.status === 'uploaded');

      if (!fileData) {
        conversionResults.push({ 
          id: id, 
          originalName: `Unknown (ID: ${id})`, 
          status: 'error', 
          error: 'File not found or already processed.' 
        });
        continue;
      }

      const inputFile = fileData.serverPath;
      const originalBaseName = path.parse(fileData.serverFileName).name;
      const sanitizedBaseName = sanitizeFilename(originalBaseName);
      const outputFileName = `${sanitizedBaseName}.m4a`;
      
      // Render.com için absolute path kullan
      const outputPath = path.resolve(__dirname, '../../converted/tool2_m4a');
      const outputFile = path.resolve(outputPath, outputFileName);

      // Directory'yi oluştur (Render.com'da gerekli)
      try {
        fs.mkdirSync(outputPath, { recursive: true });
        console.log(`Output directory ensured: ${outputPath}`);
      } catch (error) {
        console.error('Error creating output directory:', error);
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
        console.log(`Starting M4A conversion for (Tool2): ${fileData.originalName}`);
        console.log(`Input file: ${inputFile}`);
        console.log(`Output file: ${outputFile}`);
        
        // Input file kontrolü
        if (!fs.existsSync(inputFile)) {
          console.error(`Input file does not exist: ${inputFile}`);
          conversionResults.push({
            id: fileData.id,
            originalName: fileData.originalName,
            status: 'error',
            error: 'Input file not found'
          });
          resolve();
          return;
        }

        ffmpeg(inputFile)
          .format('mp4') // M4A için mp4 container kullan
          .audioCodec('aac')
          .audioBitrate('128k')
          .audioChannels(2)
          .audioFrequency(44100)
          .outputOptions([
            '-movflags', 'faststart',
            '-f', 'mp4' // Format açıkça belirt
          ])
          .on('start', (commandLine) => {
            console.log('FFmpeg command: ' + commandLine);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log(`Processing M4A (Tool2) ${fileData.originalName}: ${progress.percent.toFixed(2)}% done`);
            }
          })
          .on('end', () => {
            console.log(`M4A conversion finished for (Tool2): ${fileData.originalName}`);
            
            // Output file kontrolü
            if (fs.existsSync(outputFile)) {
              fileData.status = 'converted';
              fileData.convertedFileName = outputFileName;
              fileData.convertedFilePath = outputFile;
              fileData.downloadUrl = `/api/tool2/download/${outputFileName}`;
              fileData.conversionError = null;
              
              conversionResults.push({
                id: fileData.id,
                originalName: fileData.originalName,
                status: 'success',
                message: 'File converted successfully to M4A!',
                downloadUrl: fileData.downloadUrl
              });
            } else {
              console.error(`Output file was not created: ${outputFile}`);
              conversionResults.push({
                id: fileData.id,
                originalName: fileData.originalName,
                status: 'error',
                error: 'Output file was not created'
              });
            }
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error during M4A conversion for (Tool2) ${fileData.originalName}:`, err);
            fileData.status = 'conversion_failed';
            fileData.conversionError = err.message;
            conversionResults.push({
              id: fileData.id,
              originalName: fileData.originalName,
              status: 'error',
              error: 'Error during M4A file conversion.',
              details: err.message
            });
            resolve();
          })
          .save(outputFile); // Absolute path kullan
      });
      conversionPromises.push(promise);
    }

    await Promise.all(conversionPromises);
    console.log('All selected M4A conversions attempted. Current uploadedWavFiles:', uploadedWavFiles);
    res.json(conversionResults);
  });

  // GET route for downloading the converted file (from Tool2)
  router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.resolve(__dirname, '../../converted/tool2_m4a', filename);

    if (fs.existsSync(filePath)) {
      // M4A için doğru Content-Type
      res.setHeader('Content-Type', 'audio/mp4'); // M4A aslında audio/mp4 MIME type kullanır
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Error downloading M4A file (Tool2):', err);
        }
      });
    } else {
      res.status(404).json({ error: 'M4A file not found (Tool2).' });
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

    // Attempt to delete the original uploaded file
    if (fileData.serverPath && fs.existsSync(fileData.serverPath)) {
      try {
        fs.unlinkSync(fileData.serverPath);
        console.log(`Deleted original uploaded file: ${fileData.serverPath}`);
      } catch (err) {
        console.error(`Error deleting original file ${fileData.serverPath}:`, err);
      }
    }

    // Attempt to delete the converted file if it exists
    if (fileData.convertedFilePath && fs.existsSync(fileData.convertedFilePath)) {
      try {
        fs.unlinkSync(fileData.convertedFilePath);
        console.log(`Deleted converted M4A file: ${fileData.convertedFilePath}`);
      } catch (err) {
        console.error(`Error deleting converted M4A file ${fileData.convertedFilePath}:`, err);
      }
    }

    // Remove from the in-memory array
    uploadedWavFiles.splice(fileIndex, 1);
    console.log(`Removed file ID ${fileId} from in-memory list. Remaining files:`, uploadedWavFiles.length);

    res.json({ message: `File ${fileData.originalName} and its potential M4A conversion have been processed for deletion.` });
  });

  return router;
};