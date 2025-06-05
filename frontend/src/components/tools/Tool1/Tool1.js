import React, { useState } from 'react';
import './Tool1.css';

function Tool1() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('Upload a WAV file to convert it to M4A.');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage('File selected. Click "Convert to M4A" to proceed.');
    setDownloadUrl('');
    setError('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a WAV file first.');
      return;
    }

    setIsLoading(true);
    setMessage('Uploading and converting file...');
    setDownloadUrl('');
    setError('');

    const formData = new FormData();
    formData.append('wavFile', selectedFile);

    try {
      const response = await fetch('/api/tool1/convert-wav-to-m4a', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'File converted successfully!');
        setDownloadUrl(data.downloadUrl);
      } else {
        setError(data.error || 'An unknown error occurred during conversion.');
        setMessage('Conversion failed.');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('An error occurred while communicating with the server.');
      setMessage('Conversion failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-container tool1-converter">
      <h2>WAV to M4A Converter</h2>
      <p className="tool-description">
        Upload your WAV audio file, and we'll convert it to M4A format for you.
      </p>
      
      <div className="file-input-container">
        <input type="file" id="wavFile" accept=".wav,audio/wav,audio/x-wav" onChange={handleFileChange} />
        <label htmlFor="wavFile" className="file-input-label">
          {selectedFile ? selectedFile.name : 'Choose WAV File'}
        </label>
      </div>

      <button onClick={handleUpload} disabled={isLoading || !selectedFile} className="convert-button">
        {isLoading ? 'Converting...' : 'Convert to M4A'}
      </button>

      {message && !error && <p className={`status-message ${isLoading ? 'loading' : (downloadUrl ? 'success' : '')}`}>{message}</p>}
      {error && <p className="status-message error">{error}</p>}

      {downloadUrl && (
        <div className="download-section">
          <p>Your M4A file is ready!</p>
          <a href={downloadUrl} download className="download-link">
            Download Converted File
          </a>
        </div>
      )}
    </div>
  );
}

export default Tool1;