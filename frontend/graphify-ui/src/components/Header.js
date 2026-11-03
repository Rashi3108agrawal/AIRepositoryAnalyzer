import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">Graphify AI</h1>
        <p className="header-description">Intelligent GitHub repository analytics with AI-powered insights</p>
      </div>
    </header>
  );
};

export default Header;