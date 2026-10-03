import React from 'react';
import './EmptyState.css';

const EmptyState = ({ data, loading }) => {
  if (data || loading) return null;

  return (
    <div className="empty-state">
      <h3>Ready to analyze a repository</h3>
      <p>Enter a GitHub repository URL above to get started</p>
      <div className="empty-state-examples">
        <p>Try one of these examples:</p>
        <ul>
          <li>https://github.com/facebook/react</li>
          <li>https://github.com/microsoft/vscode</li>
          <li>https://github.com/spring-projects/spring-boot</li>
        </ul>
      </div>
    </div>
  );
};

export default EmptyState;