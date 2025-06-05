import React, { useState, useEffect, useCallback } from 'react';
import './Tool2.css';

function Tool2() {
  const [uploadedWavs, setUploadedWavs] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [conversionResults, setConversionResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [conversionMessage, setConversionMessage] = useState('');

  const fetchUploadedWavs = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/tool2/list-uploaded-wavs`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch uploaded files.');
      }
      const data = await response.json();
      setUploadedWavs(data);
      if (data.length === 0) {
        setConversionMessage('No WAV files found. Please upload files using Tool 1 first.');
      } else {
        setConversionMessage('Select files to convert to M4A format.');
      }
    } catch (err) {
      console.error('Error fetching uploaded WAVs:', err);
      setFetchError(err.message);
      setConversionMessage('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploadedWavs();
  }, [fetchUploadedWavs]);

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
      setConversionMessage('Please select at least one file to convert.');
      return;
    }

    setIsLoading(true);
    setConversionMessage(`Converting ${selectedFileIds.size} file(s) to M4A format...`);
    setConversionResults([]);
    setFetchError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/tool2/convert-selected-to-m4a`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileIds: Array.from(selectedFileIds) }),
      });

      const resultsData = await response.json();

      if (response.ok) {
        setConversionMessage('M4A conversion process complete. See results below.');
        setConversionResults(resultsData.map(result => ({
          ...result,
          downloadUrl: result.downloadUrl && result.downloadUrl.startsWith('http') ? result.downloadUrl : `${apiUrl}${result.downloadUrl}`
        })));
        // Refresh the list of uploaded WAVs as their status might have changed
        fetchUploadedWavs(); 
        setSelectedFileIds(new Set()); // Clear selection
      } else {
        const errorData = resultsData;
        setFetchError(errorData.error || 'An unknown error occurred during M4A conversion.');
        setConversionMessage('M4A conversion failed.');
         if (Array.isArray(resultsData)) {
            setConversionResults(resultsData.map(result => ({
                ...result,
                downloadUrl: result.downloadUrl && result.downloadUrl.startsWith('http') ? result.downloadUrl : `${apiUrl}${result.downloadUrl}`
            })));
        }
      }
    } catch (err) {
      console.error('Error converting files to M4A:', err);
      setFetchError('An error occurred while communicating with the server.');
      setConversionMessage('M4A conversion failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (fileId, fileName) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to delete "${fileName}"? This will remove the original uploaded file and any converted version.`)) {
      return;
    }

    setIsLoading(true);
    setFetchError('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/tool2/delete-wav/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete file ${fileName}.`);
      }
      fetchUploadedWavs(); // Refresh the list after deletion
      setConversionMessage(`File "${fileName}" marked for deletion.`);
      setConversionResults(prevResults => prevResults.filter(r => r.id !== fileId));
    } catch (err) {
      console.error('Error deleting file:', err);
      setFetchError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-container tool2-converter">
      <h2>Tool 2: Convert Uploaded WAVs to M4A</h2>
      <p className="tool-description">
        Files uploaded via Tool 1 will appear here. Select files and convert them to M4A audio format.
      </p>

      <button onClick={fetchUploadedWavs} disabled={isLoading} className="refresh-button">
        {isLoading ? 'Refreshing...' : 'Refresh File List'}
      </button>

      {fetchError && <p className="status-message error">{fetchError}</p>}
      
      {isLoading && uploadedWavs.length === 0 && !fetchError && <p className="status-message loading">Loading uploaded files...</p>}

      {!isLoading && uploadedWavs.length > 0 && (
        <div className="uploaded-files-list">
          <h3>Available WAV Files for Conversion:</h3>
          <ul>
            {uploadedWavs.map(file => (
              <li key={file.id} className="file-item-selectable">
                <input
                  type="checkbox"
                  id={`wav-${file.id}`}
                  checked={selectedFileIds.has(file.id)}
                  onChange={() => handleFileSelectionChange(file.id)}
                  disabled={isLoading}
                />
                <label htmlFor={`wav-${file.id}`}>{file.originalName} ({(file.size / 1024 / 1024).toFixed(2)} MB)</label>
                <button
                  onClick={() => handleDeleteFile(file.id, file.originalName)}
                  className="delete-file-button"
                  disabled={isLoading}
                  title="Delete this file"
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

      {conversionMessage && <p className={`status-message ${isLoading ? 'loading' : (conversionResults.length > 0 && !fetchError ? 'info' : '')}`}>{conversionMessage}</p>}
      
      {conversionResults.length > 0 && (
        <div className="results-section">
          <h3>M4A Conversion Results:</h3>
          <ul className="results-list">
            {conversionResults.map((result, index) => (
              <li key={result.id || index} className={`result-item ${result.status}`}>
                <span className="file-name">{result.originalName}</span>
                {result.status === 'success' ? (
                  <>
                    <span className="status-text success">Converted to M4A</span>
                    <a href={result.downloadUrl} download className="download-link-item">
                      Download M4A
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

export default Tool2;