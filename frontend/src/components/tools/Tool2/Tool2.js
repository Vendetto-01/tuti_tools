import React, { useState, useEffect, useCallback } from 'react';
import './Tool3.css'; // CSS will be renamed to match new tool number

// This component (Tool2.js) will be rendered as Tool 3 due to App.js changes
function Tool2() { 
  const [renamedWavs, setRenamedWavs] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [conversionResults, setConversionResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [userMessage, setUserMessage] = useState(''); // General message for user

  const fetchRenamedWavs = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    setUserMessage('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      // Calls the new Tool 3 backend endpoint
      const response = await fetch(`${apiUrl}/api/tool3/list-renamed-wavs`); 
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch renamed files.');
      }
      const data = await response.json();
      setRenamedWavs(data);
      if (data.length === 0) {
        setUserMessage('No renamed files found. Rename files using Tool 2 first.');
      } else {
        setUserMessage('Select renamed files to convert to M4A or manage.');
      }
    } catch (err) {
      console.error('Error fetching renamed WAVs:', err);
      setFetchError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRenamedWavs();
  }, [fetchRenamedWavs]);

  const handleFileSelectionChange = (fileId) => {
    setSelectedFileIds(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId);
      } else {
        newSelected.add(fileId);
      }
      return newSelected;
    });
  };

  const handleConvertSelected = async () => {
    if (selectedFileIds.size === 0) {
      setUserMessage('Please select at least one renamed file to convert.');
      return;
    }

    setIsLoading(true);
    setUserMessage(`Converting ${selectedFileIds.size} file(s) to M4A format...`);
    setConversionResults([]);
    setFetchError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      // Calls the new Tool 3 backend endpoint for conversion
      const response = await fetch(`${apiUrl}/api/tool3/convert-selected-to-m4a`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileIds: Array.from(selectedFileIds) }),
      });

      const resultsData = await response.json();

      if (response.ok) {
        setUserMessage('M4A conversion process complete for selected renamed files. See results below.');
        setConversionResults(resultsData.map(result => ({
          ...result,
          // Ensure download URL is absolute if not already
          downloadUrl: result.downloadUrl && result.downloadUrl.startsWith('http') ? result.downloadUrl : `${apiUrl}${result.downloadUrl}`
        })));
        fetchRenamedWavs(); // Refresh list as status might change
        setSelectedFileIds(new Set()); // Clear selection
      } else {
        const errorData = resultsData;
        setFetchError(errorData.error || 'An unknown error occurred during M4A conversion.');
        setUserMessage('M4A conversion failed for some or all files.');
         if (Array.isArray(resultsData)) {
            setConversionResults(resultsData.map(result => ({
                ...result,
                downloadUrl: result.downloadUrl && result.downloadUrl.startsWith('http') ? result.downloadUrl : `${apiUrl}${result.downloadUrl}`
            })));
        }
      }
    } catch (err) {
      console.error('Error converting files to M4A (Tool 3):', err);
      setFetchError('An error occurred while communicating with the server for M4A conversion.');
      setUserMessage('M4A conversion failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (fileId, fileName) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to delete "${fileName}"? This will remove the renamed WAV and any converted M4A version.`)) {
      return;
    }

    setIsLoading(true);
    setFetchError('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      // Calls the new Tool 3 backend endpoint for deletion
      const response = await fetch(`${apiUrl}/api/tool3/delete-file/${fileId}`, { 
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete file ${fileName}.`);
      }
      fetchRenamedWavs(); // Refresh the list
      setUserMessage(`File "${fileName}" and its M4A version (if any) marked for deletion.`);
      setConversionResults(prevResults => prevResults.filter(r => r.id !== fileId));
    } catch (err) {
      console.error('Error deleting file (Tool 3):', err);
      setFetchError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-container tool2-m4a-converter"> {/* Class can be updated if Tool2.css is renamed */}
      <h2>Tool 3: List & Convert Renamed WAVs to M4A</h2>
      <p className="tool-description">
        Files renamed via Tool 2 will appear here. Select files to convert them to M4A audio format or manage them.
      </p>

      <button onClick={fetchRenamedWavs} disabled={isLoading} className="refresh-button">
        {isLoading ? 'Refreshing...' : 'Refresh Renamed File List'}
      </button>

      {fetchError && <p className="status-message error">{fetchError}</p>}
      
      {isLoading && renamedWavs.length === 0 && !fetchError && <p className="status-message loading">Loading renamed files...</p>}

      {!isLoading && renamedWavs.length > 0 && (
        <div className="uploaded-files-list"> {/* Class name can be more generic */}
          <h3>Available Renamed WAV Files:</h3>
          <ul>
            {renamedWavs.map(file => (
              <li key={file.id} className="file-item-selectable">
                <input
                  type="checkbox"
                  id={`wav-${file.id}`}
                  checked={selectedFileIds.has(file.id)}
                  onChange={() => handleFileSelectionChange(file.id)}
                  disabled={isLoading || file.status === 'converted_m4a'} // Example: disable if already converted
                />
                <label htmlFor={`wav-${file.id}`}>
                  {file.serverFileName || file.originalName} (Original: {file.originalName}) - {((file.size || 0) / 1024 / 1024).toFixed(2)} MB
                  {file.status && ` - Status: ${file.status}`}
                </label>
                <button
                  onClick={() => handleDeleteFile(file.id, file.serverFileName || file.originalName)}
                  className="delete-file-button"
                  disabled={isLoading}
                  title="Delete this file and its M4A version"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <button 
            onClick={handleConvertSelected} 
            disabled={isLoading || selectedFileIds.size === 0} 
            className="convert-selected-button"
          >
            {isLoading ? 'Converting to M4A...' : `Convert ${selectedFileIds.size} Selected File(s) to M4A`}
          </button>
        </div>
      )}

      {userMessage && <p className={`status-message ${isLoading ? 'loading' : (fetchError ? 'error' : 'info')}`}>{userMessage}</p>}
      
      {conversionResults.length > 0 && (
        <div className="results-section">
          <h3>M4A Conversion Results:</h3>
          <ul className="results-list">
            {conversionResults.map((result, index) => (
              <li key={result.id || index} className={`result-item ${result.status}`}>
                <span className="file-name">{result.currentServerName || result.originalName}</span>
                {result.status === 'success' ? (
                  <>
                    <span className="status-text success">Converted to M4A</span>
                    {result.downloadUrl &&
                      <a href={result.downloadUrl} download className="download-link-item">
                        Download M4A
                      </a>
                    }
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

// Exporting as Tool2, but App.js uses it as Tool 3
export default Tool2;