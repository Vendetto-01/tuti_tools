import './App.css';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Tool1Page from './pages/Tool1Page'; // Import the new consolidated page
// We will keep Tool4 and Tool5 imports for now as they are placeholders
import Tool4 from './components/tools/Tool4/Tool4';
import Tool5 from './components/tools/Tool5/Tool5';
// Tool1, Tool2, Tool3 components are no longer directly used in App.js for routing,
// their functionality will be in Tool1Page.js or they become true placeholders.

const HomePage = () => (
  <div>
    <header className="App-header">
      <h1>Tuti Tools Dashboard</h1>
      <nav>
        <Link to="/tool1" className="tool-link-button">Access Tool Operations Hub</Link>
        {/* Future links to other dedicated tool pages can go here */}
      </nav>
    </header>
    <main className="App-main">
      <h1>Welcome to Tuti Tools</h1>
      <p>
        All primary functionalities (Upload, Rename, Convert/Manage) are now consolidated
        into the "Tool Operations Hub". Click the link above to access it.
      </p>
      <p>
        The sections below are placeholders for any future, distinct tools.
      </p>
      <div className="tools-grid">
        {/* These are now just placeholders or could be links to sections within Tool1Page if needed */}
        <div className="tool-placeholder-card">
          <h3>Tool Operations Hub</h3>
          <p>Upload, Rename, Convert, and Manage files.</p>
          <Link to="/tool1" className="tool-link-button-small">Go to Hub</Link>
        </div>
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
