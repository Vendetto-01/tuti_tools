import React from 'react';
// import './Tool1.css'; // Styles are now part of Tool1Page or global

const Tool1 = () => {
  return (
    <div className="tool-placeholder-card tool-card-legacy">
      <h3>Tool 1 Module (Legacy)</h3>
      <p>
        File upload functionality has been moved to the consolidated 
        <strong>Tool Operations Hub</strong>.
      </p>
      {/* You could add a Link here if needed: <Link to="/tool1">Go to Hub</Link> */}
    </div>
  );
};

export default Tool1;