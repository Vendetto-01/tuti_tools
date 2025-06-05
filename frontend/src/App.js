import './App.css';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Tool1Page from './pages/Tool1Page'; // Import the new consolidated page
// We will keep Tool4 and Tool5 imports for now as they are placeholders
import Tool2 from './components/tools/Tool2/Tool2'; // Now a placeholder
import Tool3 from './components/tools/Tool3/Tool3'; // Now a placeholder
import Tool4 from './components/tools/Tool4/Tool4';
import Tool5 from './components/tools/Tool5/Tool5';
// Tool1 component is no longer directly used in App.js for routing,
// its functionality will be in Tool1Page.js or it becomes true placeholders.

const HomePage = () => (
  <div>
    <header className="App-header">
      <h1>Tuti Tools Dashboard</h1>
      {/* Navigation link removed from header */}
    </header>
    <main className="App-main">
      <h1>Welcome to Tuti Tools</h1>
      <p>
        Primary functionalities (Upload, Rename, Convert/Manage) are consolidated
        into "Tool 1". Click the link above to access it.
      </p>
      <p>
        Other tools are available below:
      </p>
      <div className="tools-grid">
        <div className="tool-placeholder-card"> {/* Card for Tool 1 link */}
          <h3>Tool 1</h3>
          <p>Upload, Rename, Convert, and Manage files.</p>
          <Link to="/tool1" className="tool-link-button-small">Go to Tool 1</Link>
        </div>
        <Tool2 /> {/* Placeholder for future Tool 2 */}
        <Tool3 /> {/* Placeholder for future Tool 3 */}
        <Tool4 /> {/* Tool4 remains a placeholder */}
        <Tool5 /> {/* Tool5 remains a placeholder */}
      </div>
    </main>
    <footer className="App-footer">
      <p>&copy; 2025 Tuti Tools</p>
    </footer>
  </div>
);

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tool1" element={<Tool1Page />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
