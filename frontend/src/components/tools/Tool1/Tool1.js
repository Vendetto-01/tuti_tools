import React, { useState } from 'react';
import './Tool1.css'; // Styles might need adjustment later

function Tool1() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadMessage, setUploadMessage] = useState('Select WAV files to upload.');
  const [uploadedFilesInfo, setUploadedFilesInfo] = useState([]); // Store info about successfully uploaded files
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    if (files.length > 0) {
      setUploadMessage(`${files.length} file(s) selected. Click "Upload Files" to proceed.`);
    } else {
      setUploadMessage('Select WAV files to upload.');
    }
    setUploadedFilesInfo([]); // Clear previous upload info
    setUploadError('');
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('Please select one or more WAV files first.');
      return;
    }

    setIsLoading(true);
    setUploadMessage(`Uploading ${selectedFiles.length} file(s)...`);
    setUploadedFilesInfo([]);
    setUploadError('');

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('wavFiles', file);
    });

    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      // Update endpoint to the new upload-only endpoint
      const response = await fetch(`${apiUrl}/api/tool1/upload-wavs`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadMessage(data.message || `${data.uploadedFiles?.length || 0} file(s) uploaded successfully. Go to Tool 2 to convert.`);
        setUploadedFilesInfo(data.uploadedFiles || []);
        setSelectedFiles([]); // Clear selection after successful upload
      } else {
        setUploadError(data.error || 'An unknown error occurred during upload.');
        setUploadMessage('Upload failed.');
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      setUploadError('An error occurred while communicating with the server.');
      setUploadMessage('Upload failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-container tool1-uploader"> {/* New class for specific styling if needed */}
      <h2>Tool 1: Upload WAV Files</h2>
      <p className="tool-description">
        Select one or more WAV audio files to upload. After uploading, proceed to Tool 2 to convert them.
      </p>
      
      <div className="file-input-container">
        <input 
          type="file" 
          id="wavUploadInput" 
          accept=".wav,audio/wav,audio/x-wav" 
          onChange={handleFileChange} 
          multiple 
        />
        <label htmlFor="wavUploadInput" className="file-input-label">
          {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) chosen` : 'Choose WAV Files'}
        </label>
      </div>

      <button 
        onClick={handleUpload} 
        disabled={isLoading || selectedFiles.length === 0} 
        className="upload-button" // Potentially new class for styling
      >
        {isLoading ? `Uploading ${selectedFiles.length} file(s)...` : 'Upload Files'}
      </button>

      {uploadMessage && !uploadError && <p className={`status-message ${isLoading ? 'loading' : (uploadedFilesInfo.length > 0 ? 'success' : 'info')}`}>{uploadMessage}</p>}
      {uploadError && <p className="status-message error">{uploadError}</p>}

      {uploadedFilesInfo.length > 0 && !isLoading && (
        <div className="uploaded-files-summary">
          <h3>Successfully Uploaded:</h3>
          <ul>
            {uploadedFilesInfo.map((file) => (
              <li key={file.id}>{file.originalName}</li>
            ))}
          </ul>
          <p>You can now go to <strong>Tool 2</strong> to see these files and convert them.</p>
        </div>
      )}
    </div>
  );
}

export default Tool1;