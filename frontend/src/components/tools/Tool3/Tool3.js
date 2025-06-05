import React, { useState, useEffect, useCallback } from 'react';
import './Tool2.css'; // CSS will be renamed to match new tool number

function Tool3() { // This component will be rendered as Tool 2 due to App.js changes
  const [originalWavs, setOriginalWavs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [renameMessage, setRenameMessage] = useState('');

  const fetchOriginalWavs = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    setRenameMessage('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      // This component (Tool3.js) is now effectively Tool 2, so it calls /api/tool2
      const response = await fetch(`${apiUrl}/api/tool2/list-original-wavs`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch original WAV files.');
      }
      const data = await response.json();
      setOriginalWavs(data);
      if (data.length === 0) {
        setRenameMessage('No WAV files found that are ready for renaming. Upload files via Tool 1.');
      } else {
        setRenameMessage('Select a file to rename (appends "a" to the filename).');
      }
    } catch (err) {
      console.error('Error fetching original WAVs:', err);
      setFetchError(err.message);
      setRenameMessage('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOriginalWavs();
  }, [fetchOriginalWavs]);

  const handleRenameFile = async (fileId, currentName) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to rename "${currentName}"?\nThis will append 'a' to its name on the server.`)) {
      return;
    }

    setIsLoading(true);
    setFetchError('');
    setRenameMessage(`Renaming ${currentName}...`);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/tool2/rename-wav/${fileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const resultData = await response.json();

      if (response.ok) {
        setRenameMessage(resultData.message || `File ${currentName} renamed successfully.`);
        // Refresh the list to show updated names or remove renamed files from this list
        fetchOriginalWavs();
      } else {
        setFetchError(resultData.error || 'An unknown error occurred during renaming.');
        setRenameMessage(`Failed to rename ${currentName}.`);
      }
    } catch (err) {
      console.error('Error renaming file:', err);
      setFetchError('An error occurred while communicating with the server for renaming.');
      setRenameMessage(`Failed to rename ${currentName}.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-container tool3-rename-tool"> {/* Updated class for clarity */}
      <h2>Tool 2: Rename Uploaded WAV Files</h2>
      <p className="tool-description">
        Files uploaded via Tool 1 that are eligible for renaming will appear here.
        Renaming a file will append the letter 'a' to its current server filename.
      </p>

      <button onClick={fetchOriginalWavs} disabled={isLoading} className="refresh-button">
        {isLoading ? 'Refreshing...' : 'Refresh File List'}
      </button>

      {fetchError && <p className="status-message error">{fetchError}</p>}
      
      {isLoading && originalWavs.length === 0 && !fetchError && <p className="status-message loading">Loading files for renaming...</p>}

      {!isLoading && originalWavs.length > 0 && (
        <div className="files-to-rename-list">
          <h3>Available WAV Files for Renaming:</h3>
          <ul>
            {originalWavs.map(file => (
              <li key={file.id} className="file-item-actionable">
                <span className="file-name-display">
                  {file.originalName} (Server: {file.serverFileName}) - {((file.size || 0) / 1024 / 1024).toFixed(2)} MB
                </span>
                <button
                  onClick={() => handleRenameFile(file.id, file.serverFileName)}
                  className="rename-button"
                  disabled={isLoading}
                  title={`Rename ${file.serverFileName}`}
                >
                  Rename
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {renameMessage && <p className={`status-message ${fetchError ? 'error' : 'info'}`}>{renameMessage}</p>}
    </div>
  );
}

export default Tool3; // Still exporting as Tool3, but App.js uses it as Tool 2