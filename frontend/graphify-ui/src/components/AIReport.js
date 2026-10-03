import React from 'react';
import './AIReport.css';

const AIReport = ({ repo }) => {
  if (!repo || !repo?.insights?.aiSummary) return null;

  return (
    <div className="card aiReportCard">
      <div className="aiHeader">
        🤖 AI Code Intelligence Report
      </div>

      <div className="aiContent">
        <p>{repo.insights.aiSummary}</p>
      </div>

      {/* Optional structured AI insights */}
      {repo.insights.strengths || repo.insights.areas_for_improvement ? (
        <div className="aiGrid">
          {repo.insights.strengths && (
            <div className="aiBox green">
              <h4>Strengths</h4>
              <ul>
                {repo.insights.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {repo.insights.areas_for_improvement && (
            <div className="aiBox yellow">
              <h4>Areas for Improvement</h4>
              <ul>
                {repo.insights.areas_for_improvement.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default AIReport;