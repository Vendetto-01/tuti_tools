import './App.css';
import Tool1 from './components/tools/Tool1/Tool1';
import Tool2 from './components/tools/Tool2/Tool2';
import Tool3 from './components/tools/Tool3/Tool3';
import Tool4 from './components/tools/Tool4/Tool4';
import Tool5 from './components/tools/Tool5/Tool5';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Tuti Tools</h1>
      </header>
      <main className="App-main">
        <h1>Available Tools</h1>
        <p>Here are the tools currently available in this application:</p>
        <div className="tools-grid">
          <Tool1 />
          <Tool2 />
          <Tool3 />
          <Tool4 />
          <Tool5 />
        </div>
      </main>
      <footer className="App-footer">
        <p>&copy; 2025 Tuti Tools</p>
      </footer>
    </div>
  );
}

export default App;
