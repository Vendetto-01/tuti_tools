import React, { useState, useEffect, useCallback } from 'react';
import './Tool3.css';

function Tool3() {
  const [convertedFiles, setConvertedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [message, setMessage] = useState('');

  const fetchConvertedFiles = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    setMessage('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/tool3/list-converted-files`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch converted files.');
      }
      const data = await response.json();
      setConvertedFiles(data);
      if (data.length === 0) {
        setMessage('No converted M4A files found. Please convert files using Tool 2 first.');
      } else {
        setMessage('');
      }
    } catch (err) {
      console.error('Error fetching converted M4A files:', err);
      setFetchError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConvertedFiles();
  }, [fetchConvertedFiles]);

  return (
    <div className="tool-container tool3-manager">
      <h2>Tool 3: Manage Converted M4A Files</h2>
      <p className="tool-description">
        View your successfully converted M4A files. Renaming functionality will be added later.
      </p>

      <button onClick={fetchConvertedFiles} disabled={isLoading} className="refresh-button">
        {isLoading ? 'Refreshing...' : 'Refresh M4A File List'}
      </button>

      {fetchError && <p className="status-message error">{fetchError}</p>}
      {message && !fetchError && <p className="status-message info">{message}</p>}
      
      {isLoading && convertedFiles.length === 0 && !fetchError && <p className="status-message loading">Loading converted M4A files...</p>}

      {!isLoading && convertedFiles.length > 0 && (
        <div className="converted-files-list">
          <h3>Successfully Converted M4A Files:</h3>
          <ul>
            {convertedFiles.map(file => (
              <li key={file.id} className="file-item-converted">
                <div className="file-info">
                  <span className="original-name">Original: {file.originalName}</span>
                  <span className="converted-name">Converted: {file.convertedFileName}</span>
                </div>
                <div className="file-actions">
                  <a 
                    href={(file.downloadUrl && file.downloadUrl.startsWith('http')) ? file.downloadUrl : (process.env.REACT_APP_API_URL || '') + file.downloadUrl} 
                    download 
                    className="download-link-item"
                  >
                    Download M4A
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Tool3;