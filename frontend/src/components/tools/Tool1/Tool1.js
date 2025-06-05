import React, { useState } from 'react';
import './Tool1.css';

function Tool1() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [overallMessage, setOverallMessage] = useState('Upload WAV files to convert them to M4A.');
  const [fileResults, setFileResults] = useState([]); // To store results for each file
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    if (files.length > 0) {
      setOverallMessage(`${files.length} file(s) selected. Click "Convert to M4A" to proceed.`);
    } else {
      setOverallMessage('Upload WAV files to convert them to M4A.');
    }
    setFileResults([]);
    setGeneralError('');
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setGeneralError('Please select one or more WAV files first.');
      return;
    }

    setIsLoading(true);
    setOverallMessage(`Uploading ${selectedFiles.length} file(s)...`);
    setFileResults([]); // Clear previous results
    setGeneralError('');

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('wavFiles', file); // Use 'wavFiles' to match backend
    });

    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/tool1/convert-wav-to-m4a`, {
        method: 'POST',
        body: formData,
      });

      // The backend now returns an array of results
      const resultsData = await response.json();

      if (response.ok) {
        setOverallMessage('Processing complete. See results below.');
        setFileResults(resultsData.map(result => ({
          ...result,
          // Ensure downloadUrl is absolute
          downloadUrl: result.downloadUrl && result.downloadUrl.startsWith('http') ? result.downloadUrl : `${apiUrl}${result.downloadUrl}`
        })));
      } else {
        // Handle general error from backend if the request itself failed (e.g., 400, 500)
        const errorData = resultsData; // Assuming error response might also be JSON
        setGeneralError(errorData.error || 'An unknown error occurred during processing.');
        setOverallMessage('Processing failed.');
        if (Array.isArray(resultsData)) { // If backend sent partial results despite overall error
            setFileResults(resultsData.map(result => ({
                ...result,
                downloadUrl: result.downloadUrl && result.downloadUrl.startsWith('http') ? result.downloadUrl : `${apiUrl}${result.downloadUrl}`
            })));
        }
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      setGeneralError('An error occurred while communicating with the server.');
      setOverallMessage('Processing failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-container tool1-converter">
      <h2>WAV to M4A Converter (Multiple Files)</h2>
      <p className="tool-description">
        Upload your WAV audio files, and we'll convert them to M4A format.
      </p>
      
      <div className="file-input-container">
        <input 
          type="file" 
          id="wavFiles" // Changed id
          accept=".wav,audio/wav,audio/x-wav" 
          onChange={handleFileChange} 
          multiple // Allow multiple file selection
        />
        <label htmlFor="wavFiles" className="file-input-label">
          {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) chosen` : 'Choose WAV Files'}
        </label>
      </div>

      <button onClick={handleUpload} disabled={isLoading || selectedFiles.length === 0} className="convert-button">
        {isLoading ? `Processing ${selectedFiles.length} file(s)...` : 'Convert to M4A'}
      </button>

      {overallMessage && !generalError && <p className={`status-message ${isLoading ? 'loading' : (fileResults.length > 0 ? 'info' : '')}`}>{overallMessage}</p>}
      {generalError && <p className="status-message error">{generalError}</p>}

      {fileResults.length > 0 && (
        <div className="results-section">
          <h3>Conversion Results:</h3>
          <ul className="results-list">
            {fileResults.map((result, index) => (
              <li key={index} className={`result-item ${result.status}`}>
                <span className="file-name">{result.originalName}</span>
                {result.status === 'success' ? (
                  <>
                    <span className="status-text success">Converted</span>
                    <a href={result.downloadUrl} download className="download-link-item">
                      Download
                    </a>
                  </>
                ) : (
                  <span className="status-text error">Failed: {result.details || result.error}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Tool1;