// DependencyViewer.js – lists Maven and NPM dependencies
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function DependencyViewer() {
  const [deps, setDeps] = useState({ maven: [], npm: [] });
  const [error, setError] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";

  useEffect(() => {
    const fetchDeps = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/dependencies`);
        setDeps(res.data || { maven: [], npm: [] });
      } catch (e) {
        setError("Failed to load dependencies");
      }
    };
    fetchDeps();
  }, []);

  return (
    <div className="dependency-viewer">
      <h3>Project Dependencies</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <section>
        <h4>Maven (pom.xml)</h4>
        <ul>
          {deps.maven && deps.maven.map((d, i) => (
            <li key={i}>{d.groupId}:{d.artifactId}:{d.version}</li>
          ))}
        </ul>
      </section>
      <section>
        <h4>NPM (package.json)</h4>
        <ul>
          {deps.npm && deps.npm.map((d, i) => (
            <li key={i}>{d.name}: {d.version}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

