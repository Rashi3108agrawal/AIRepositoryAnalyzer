// SearchBar.js – simple text filter for nodes
import React from "react";
import "./SearchBar.css";

export default function SearchBar({ query, setQuery }) {
  return (
    <div className="sg-search-bar">
      <input
        type="text"
        placeholder="Search files…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="sg-input"
        aria-label="Search graph nodes"
      />
    </div>
  );
}

