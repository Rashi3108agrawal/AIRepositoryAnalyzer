import React from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import java from "react-syntax-highlighter/dist/esm/languages/hljs/java";
import xml from "react-syntax-highlighter/dist/esm/languages/hljs/xml";
import yaml from "react-syntax-highlighter/dist/esm/languages/hljs/yaml";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import "./FilePreview.css";

SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("xml", xml);
SyntaxHighlighter.registerLanguage("yaml", yaml);

export default function FilePreview({ filePath, content, onClose }) {
  const ext = filePath.split('.').pop().toLowerCase();
  const language = {
    js: "javascript",
    jsx: "javascript",
    ts: "javascript",
    tsx: "javascript",
    java: "java",
    xml: "xml",
    html: "xml",
    yaml: "yaml",
    yml: "yaml",
  }[ext] || "text";

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-pane" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <span className="preview-title">{filePath}</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <SyntaxHighlighter language={language} style={docco} wrapLines={true}>
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

