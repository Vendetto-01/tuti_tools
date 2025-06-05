import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect, useCallback
import { Link } from 'react-router-dom';
// Tool1Component import is no longer needed as its content is merged.
// import Tool1Component from '../components/tools/Tool1/Tool1';
// We will later integrate Tool3.js (Rename) and Tool2.js (Convert/Manage) functionalities here
// import './Tool1Page.css'; // We can create a dedicated CSS file later if needed
// CSS imports for original Tool1, Tool2 (Tool3.css), Tool3 (Tool2.css) are removed
// as styling is now handled by App.css and classes within this component.

const Tool1Page = () => {
  // --- Start of UPLOAD (from Tool1.js) State & Handlers ---
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadMessage, setUploadMessage] = useState('Select WAV files to upload.');
  const [uploadedFilesInfo, setUploadedFilesInfo] = useState([]); // Store info about successfully uploaded files
  const [isUploadLoading, setIsUploadLoading] = useState(false); // Renamed to avoid conflict
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

    setIsUploadLoading(true);
    setUploadMessage(`Uploading ${selectedFiles.length} file(s)...`);
    setUploadedFilesInfo([]);
    setUploadError('');

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('wavFiles', file);
    });

    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/tool1/upload-wavs`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadMessage(data.message || `${data.uploadedFiles?.length || 0} file(s) uploaded successfully. Proceed to rename or convert.`);
        setUploadedFilesInfo(data.uploadedFiles || []);
        setSelectedFiles([]);
        fetchFilesForRename(); // Refresh rename list after successful upload
      } else {
        setUploadError(data.error || 'An unknown error occurred during upload.');
        setUploadMessage('Upload failed.');
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      setUploadError('An error occurred while communicating with the server.');
      setUploadMessage('Upload failed.');
    } finally {
      setIsUploadLoading(false);
    }
  };
  // --- End of UPLOAD (from Tool1.js) State & Handlers ---

  // --- Start of RENAME (from Tool3.js) State & Handlers ---
  const [filesForRename, setFilesForRename] = useState([]);
  const [selectedFileIdsForRename, setSelectedFileIdsForRename] = useState(new Set()); // New state for selected files for rename
  const [isRenameLoading, setIsRenameLoading] = useState(false);
  const [renameFetchError, setRenameFetchError] = useState('');
  const [renameUserMessage, setRenameUserMessage] = useState('');

  const fetchFilesForRename = useCallback(async () => {
    setIsRenameLoading(true);
    setRenameFetchError('');
    setRenameUserMessage('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/tool2/list-original-wavs`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files for renaming.');
      }
      const data = await response.json();
      setFilesForRename(data);
      if (data.length === 0) {
        setRenameUserMessage('No WAV files found that are ready for renaming. Upload files above.');
      } else {
        setRenameUserMessage('Select a file to rename.');
      }
    } catch (err) {
      console.error('Error fetching files for renaming:', err);
      setRenameFetchError(err.message);
    } finally {
      setIsRenameLoading(false);
    }
  }, []);

  useEffect(() => { // Initial fetch for rename list
    fetchFilesForRename();
  }, [fetchFilesForRename]);

  const handleRenameFileSelectionChange = (fileId) => {
    setSelectedFileIdsForRename(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId);
      } else {
        newSelected.add(fileId);
      }
      return newSelected;
    });
  };

  const handleSelectAllForRename = (event) => {
    if (event.target.checked) {
      const allFileIds = new Set(filesForRename.map(f => f.id));
      setSelectedFileIdsForRename(allFileIds);
    } else {
      setSelectedFileIdsForRename(new Set());
    }
  };
  
  const processRenameSelectedFiles = async () => {
    if (selectedFileIdsForRename.size === 0) {
      setRenameUserMessage("Please select files to rename.");
      return;
    }

    setIsRenameLoading(true);
    setRenameFetchError('');
    let successCount = 0;
    let errorCount = 0;
    const totalToProcess = selectedFileIdsForRename.size;
    setRenameUserMessage(`Starting batch rename for ${totalToProcess} file(s)...`);

    for (const fileId of selectedFileIdsForRename) {
      const fileToRename = filesForRename.find(f => f.id === fileId);
      if (!fileToRename) continue;

      try {
        setRenameUserMessage(`Renaming ${fileToRename.serverFileName} (${successCount + errorCount + 1}/${totalToProcess})...`);
        const apiUrl = process.env.REACT_APP_API_URL || '';
        const response = await fetch(`${apiUrl}/api/tool2/rename-wav/${fileId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const resultData = await response.json();
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed to rename ${fileToRename.serverFileName}: ${resultData.error}`);
          // Optionally, accumulate errors to show user
        }
      } catch (err) {
        errorCount++;
        console.error(`Error renaming ${fileToRename.serverFileName}:`, err);
        // Optionally, accumulate errors
      }
    }

    setRenameUserMessage(`Batch rename complete. Success: ${successCount}, Failed: ${errorCount}.`);
    fetchFilesForRename(); // Refresh this list
    fetchFilesForConversion(); // Refresh next list
    setSelectedFileIdsForRename(new Set()); // Clear selection
    setIsRenameLoading(false);
  };

  // Note: The individual handleRenameFile function is removed as batch processing is primary.
  // If individual rename buttons per item are desired, they would call a similar single-item process or add to selection and call batch.
  // --- End of RENAME (from Tool3.js) State & Handlers ---

  // --- Start of CONVERT/MANAGE (from Tool2.js) State & Handlers ---
  const [filesForConversion, setFilesForConversion] = useState([]); // Renamed from renamedWavs
  const [selectedFileIdsForConversion, setSelectedFileIdsForConversion] = useState(new Set()); // Renamed
  const [conversionApiResults, setConversionApiResults] = useState([]); // Renamed from conversionResults
  const [isConvertLoading, setIsConvertLoading] = useState(false); // Renamed from isLoading
  const [convertFetchError, setConvertFetchError] = useState(''); // Renamed from fetchError
  const [convertUserMessage, setConvertUserMessage] = useState(''); // Renamed from userMessage

  const fetchFilesForConversion = useCallback(async () => {
    setIsConvertLoading(true);
    setConvertFetchError('');
    setConvertUserMessage('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/tool3/list-renamed-wavs`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files for conversion.');
      }
      const data = await response.json();
      setFilesForConversion(data);
      if (data.length === 0) {
        setConvertUserMessage('No files found ready for M4A conversion. Upload and rename files first.');
      } else {
        setConvertUserMessage('Select files to convert to M4A or manage.');
      }
    } catch (err) {
      console.error('Error fetching files for conversion:', err);
      setConvertFetchError(err.message);
    } finally {
      setIsConvertLoading(false);
    }
  }, []);

  useEffect(() => { // Initial fetch for conversion list
    fetchFilesForConversion();
  }, [fetchFilesForConversion]);

  const handleConversionFileSelectionChange = (fileId) => {
    setSelectedFileIdsForConversion(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId);
      } else {
        newSelected.add(fileId);
      }
      return newSelected;
    });
  };

  const handleSelectAllForConversion = (event) => {
    if (event.target.checked) {
      // Select only files that are not already converted or in a non-actionable state, if applicable
      const allFileIds = new Set(filesForConversion.filter(f => f.status !== 'converted_m4a' /* Add other conditions if needed */).map(f => f.id));
      setSelectedFileIdsForConversion(allFileIds);
    } else {
      setSelectedFileIdsForConversion(new Set());
    }
  };

  const handleConvertSelectedFiles = async () => {
    if (selectedFileIdsForConversion.size === 0) {
      setConvertUserMessage('Please select at least one file to convert.');
      return;
    }
    setIsConvertLoading(true);
    setConvertUserMessage(`Converting ${selectedFileIdsForConversion.size} file(s) to M4A...`);
    setConversionApiResults([]);
    setConvertFetchError('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/tool3/convert-selected-to-m4a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: Array.from(selectedFileIdsForConversion) }),
      });
      const resultsData = await response.json();
      if (response.ok) {
        setConvertUserMessage('M4A conversion process complete. See results below.');
        setConversionApiResults(resultsData.map(result => ({
          ...result,
          downloadUrl: result.downloadUrl && result.downloadUrl.startsWith('http') ? result.downloadUrl : `${apiUrl}${result.downloadUrl}`
        })));
        fetchFilesForConversion(); // Refresh list
        fetchFilesForRename(); // Also refresh rename list as status might affect it
        setSelectedFileIdsForConversion(new Set());
      } else {
        setConvertFetchError(resultsData.error || 'An unknown error occurred during M4A conversion.');
        setConvertUserMessage('M4A conversion failed for some files.');
        if (Array.isArray(resultsData)) {
            setConversionApiResults(resultsData.map(result => ({
                ...result,
                downloadUrl: result.downloadUrl && result.downloadUrl.startsWith('http') ? result.downloadUrl : `${apiUrl}${result.downloadUrl}`
            })));
        }
      }
    } catch (err) {
      console.error('Error converting files to M4A:', err);
      setConvertFetchError('An error occurred while communicating with the server for M4A conversion.');
      setConvertUserMessage('M4A conversion failed.');
    } finally {
      setIsConvertLoading(false);
    }
  };

  const handleDeleteSelectedFiles = async () => {
    if (selectedFileIdsForConversion.size === 0) {
      setConvertUserMessage("Please select files to delete.");
      return;
    }
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to delete ${selectedFileIdsForConversion.size} selected file(s) and their M4A versions?`)) {
        return;
    }

    setIsConvertLoading(true); // Reuse loading state
    setConvertFetchError('');
    let successCount = 0;
    let errorCount = 0;
    const totalToProcess = selectedFileIdsForConversion.size;
    setConvertUserMessage(`Starting batch delete for ${totalToProcess} file(s)...`);

    for (const fileId of selectedFileIdsForConversion) {
      const fileToDelete = filesForConversion.find(f => f.id === fileId);
      if (!fileToDelete) continue;
      try {
        setConvertUserMessage(`Deleting ${fileToDelete.serverFileName || fileToDelete.originalName} (${successCount + errorCount + 1}/${totalToProcess})...`);
        const apiUrl = process.env.REACT_APP_API_URL || '';
        const response = await fetch(`${apiUrl}/api/tool3/delete-file/${fileId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          successCount++;
        } else {
          const errorData = await response.json();
          errorCount++;
          console.error(`Failed to delete ${fileToDelete.serverFileName}: ${errorData.error}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`Error deleting ${fileToDelete.serverFileName}:`, err);
      }
    }
    setConvertUserMessage(`Batch delete complete. Success: ${successCount}, Failed: ${errorCount}.`);
    fetchFilesForConversion(); // Refresh this list
    fetchFilesForRename();    // Refresh rename list as well
    setSelectedFileIdsForConversion(new Set()); // Clear selection
    setIsConvertLoading(false);
  };

  // handleDownloadSelectedM4As function removed

  const handleDeleteConvertedFile = async (fileId, fileName) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to delete "${fileName}"? This removes the WAV and any M4A version.`)) {
      return;
    }
    setIsConvertLoading(true); // Use convert loading state for this action too
    setConvertFetchError('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/tool3/delete-file/${fileId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete file ${fileName}.`);
      }
      setConvertUserMessage(`File "${fileName}" marked for deletion.`);
      fetchFilesForConversion(); // Refresh conversion list
      fetchFilesForRename(); // Refresh rename list
      setConversionApiResults(prevResults => prevResults.filter(r => r.id !== fileId));
    } catch (err) {
      console.error('Error deleting file:', err);
      setConvertFetchError(err.message);
    } finally {
      setIsConvertLoading(false);
    }
  };
  // --- End of CONVERT/MANAGE (from Tool2.js) State & Handlers ---

  return (
    <div className="tool-page-container"> {/* Removed theme-tech-neon, styles now from App.css */}
      <header className="App-header"> {/* Consider a Layout component for repeated structures */}
        <h1>Tool 1</h1> {/* Renamed */}
        <nav>
          <Link to="/" className="tool-link-button">Back to Home Dashboard</Link>
        </nav>
      </header>
      <main className="App-main">
        <p>
          This tool consolidates: File Upload, File Renaming, and M4A Conversion/Management.
        </p>

        <section className="tool-section" id="upload-section">
          <h2>Step 1: Upload WAV Files</h2>
          {/* --- Start of UPLOAD (from Tool1.js) JSX --- */}
          <div className="tool-container tool1-uploader"> {/* Class from original Tool1.js */}
            <p className="tool-description">
              Select one or more WAV audio files to upload.
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
              disabled={isUploadLoading || selectedFiles.length === 0}
              className="upload-button"
            >
              {isUploadLoading ? `Uploading ${selectedFiles.length} file(s)...` : 'Upload Files'}
            </button>
            {uploadMessage && !uploadError && <p className={`status-message ${isUploadLoading ? 'loading' : (uploadedFilesInfo.length > 0 ? 'success' : 'info')}`}>{uploadMessage}</p>}
            {uploadError && <p className="status-message error">{uploadError}</p>}
            {uploadedFilesInfo.length > 0 && !isUploadLoading && (
              <div className="uploaded-files-summary">
                <h3>Successfully Uploaded:</h3>
                <ul>
                  {uploadedFilesInfo.map((file) => (
                    <li key={file.id}>{file.originalName || file.trueOriginalName || file.serverFileName}</li>
                  ))}
                </ul>
                <p>You can now proceed to rename or convert these files below.</p>
              </div>
            )}
          </div>
          {/* --- End of UPLOAD (from Tool1.js) JSX --- */}
        </section>

        <section className="tool-section" id="rename-section">
          <h2>Step 2: Rename Uploaded Files</h2>
          {/* --- Start of RENAME (from Tool3.js) JSX --- */}
          <div className="tool-container tool3-rename-tool"> {/* Class from original Tool3.js */}
            <p className="tool-description">
              Files uploaded above that are eligible for renaming will appear here.
              The configured renaming rule (strip hyphens) will be applied.
            </p>
            <button onClick={fetchFilesForRename} disabled={isRenameLoading} className="refresh-button">
              {isRenameLoading ? 'Refreshing...' : 'Refresh File List for Renaming'}
            </button>

            {renameFetchError && <p className="status-message error">{renameFetchError}</p>}
            
            {isRenameLoading && filesForRename.length === 0 && !renameFetchError && <p className="status-message loading">Loading files for renaming...</p>}

            {!isRenameLoading && filesForRename.length > 0 && (
              <div className="files-to-rename-list">
                <h3>Available Files for Renaming:</h3>
                <div className="batch-actions">
                  <input
                    type="checkbox"
                    id="selectAllRename"
                    onChange={handleSelectAllForRename}
                    checked={selectedFileIdsForRename.size === filesForRename.length && filesForRename.length > 0}
                    disabled={isRenameLoading}
                  />
                  <label htmlFor="selectAllRename" style={{ marginRight: '10px' }}>Select All</label>
                  <button
                    onClick={processRenameSelectedFiles}
                    disabled={isRenameLoading || selectedFileIdsForRename.size === 0}
                    className="batch-rename-button"
                  >
                    Rename Selected ({selectedFileIdsForRename.size})
                  </button>
                </div>
                <ul>
                  {filesForRename.map(file => (
                    <li key={file.id} className="file-item-selectable"> {/* Changed class */}
                      <input
                        type="checkbox"
                        id={`rename-${file.id}`}
                        checked={selectedFileIdsForRename.has(file.id)}
                        onChange={() => handleRenameFileSelectionChange(file.id)}
                        disabled={isRenameLoading}
                      />
                      <label htmlFor={`rename-${file.id}`} className="file-name-display">
                        {file.trueOriginalName || file.originalName} (Server: {file.serverFileName}) - {((file.size || 0) / 1024 / 1024).toFixed(2)} MB
                      </label>
                      {/* Individual rename button can be kept or removed if batch is preferred */}
                      {/* <button
                        onClick={() => handleRenameFile(file.id, file.serverFileName)} // This would need to be adapted or use the batch process for one
                        className="rename-button"
                        disabled={isRenameLoading}
                        title={`Rename ${file.serverFileName}`}
                      >
                        Rename
                      </button> */}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {renameUserMessage && <p className={`status-message ${renameFetchError ? 'error' : (isRenameLoading ? 'loading' : 'info')}`}>{renameUserMessage}</p>}
          </div>
          {/* --- End of RENAME (from Tool3.js) JSX --- */}
        </section>

        <section className="tool-section" id="convert-manage-section">
          <h2>Step 3: Convert to M4A & Manage Files</h2>
          {/* --- Start of CONVERT/MANAGE (from Tool2.js) JSX --- */}
          <div className="tool-container tool2-m4a-converter"> {/* Class from original Tool2.js */}
            <p className="tool-description">
              Files renamed above will appear here. Select files to convert them to M4A or manage them.
            </p>
            <button onClick={fetchFilesForConversion} disabled={isConvertLoading} className="refresh-button">
              {isConvertLoading ? 'Refreshing...' : 'Refresh File List for Conversion'}
            </button>

            {convertFetchError && <p className="status-message error">{convertFetchError}</p>}
            
            {isConvertLoading && filesForConversion.length === 0 && !convertFetchError && <p className="status-message loading">Loading files for conversion...</p>}

            {!isConvertLoading && filesForConversion.length > 0 && (
              <div className="uploaded-files-list">
                <h3>Available Files for M4A Conversion/Management:</h3>
                <div className="batch-actions" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="checkbox"
                    id="selectAllConvert"
                    onChange={handleSelectAllForConversion}
                    checked={selectedFileIdsForConversion.size === filesForConversion.filter(f => f.status !== 'converted_m4a').length && filesForConversion.filter(f => f.status !== 'converted_m4a').length > 0}
                    disabled={isConvertLoading}
                    style={{ marginRight: '5px', verticalAlign: 'middle' }}
                  />
                  <label htmlFor="selectAllConvert" style={{ marginRight: '20px', verticalAlign: 'middle', cursor: 'pointer' }}>Select All Convertible</label>
                  <button
                    onClick={handleConvertSelectedFiles}
                    disabled={isConvertLoading || selectedFileIdsForConversion.size === 0}
                    className="convert-selected-button"
                    style={{ marginRight: '10px' }}
                  >
                    Convert Selected ({selectedFileIdsForConversion.size})
                  </button>
                  {/* "Download Selected M4As" button removed */}
                  <button
                    onClick={handleDeleteSelectedFiles}
                    disabled={isConvertLoading || selectedFileIdsForConversion.size === 0}
                    className="batch-delete-button"
                    style={{ backgroundColor: '#ef5350', color: 'white' }} // Destructive action style
                  >
                    Delete Selected ({selectedFileIdsForConversion.size})
                  </button>
                </div>
                <ul>
                  {filesForConversion.map(file => (
                    <li key={file.id} className="file-item-selectable">
                      <input
                        type="checkbox"
                        id={`convert-wav-${file.id}`}
                        checked={selectedFileIdsForConversion.has(file.id)}
                        onChange={() => handleConversionFileSelectionChange(file.id)}
                        disabled={isConvertLoading || file.status === 'converted_m4a'} // Keep disabled if already converted
                        style={{ marginRight: '10px', verticalAlign: 'middle' }}
                      />
                      <label htmlFor={`convert-wav-${file.id}`} style={{ verticalAlign: 'middle', cursor: 'pointer', flexGrow: 1 }}>
                        {file.serverFileName || file.originalName} (Original: {file.trueOriginalName || file.originalName}) - {((file.size || 0) / 1024 / 1024).toFixed(2)} MB
                        {file.status && ` - Status: ${file.status}`}
                      </label>
                      <button
                        onClick={() => handleDeleteConvertedFile(file.id, file.serverFileName || file.originalName)}
                        className="delete-file-button"
                        disabled={isConvertLoading}
                        title="Delete this file and its M4A version"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
                {/* Convert button moved to batch actions div */}
              </div>
            )}

            {convertUserMessage && <p className={`status-message ${isConvertLoading ? 'loading' : (convertFetchError ? 'error' : 'info')}`}>{convertUserMessage}</p>}
            
            {conversionApiResults.length > 0 && (
              <div className="results-section">
                <h3>M4A Conversion Results:</h3>
                <ul className="results-list">
                  {conversionApiResults.map((result, index) => (
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
          {/* --- End of CONVERT/MANAGE (from Tool2.js) JSX --- */}
        </section>
      </main>
      <footer className="App-footer">
        <p>&copy; 2025 Tuti Tools - Xylogasm Multifart Conversplosion</p> {/* Renamed */}
      </footer>
    </div>
  );
};

export default Tool1Page;