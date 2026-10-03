import React from 'react';
import './ContributorPanel.css';

const ContributorPanel = ({ contributors }) => {
  if (!contributors) return null;

  return (
    <div className="card glass aiPanel">
      <h3>Contributor Intelligence</h3>
      <div className="aiGrid">
        <div>
          <p>Bus Factor</p>
          <h2>{contributors.busFactor ?? "N/A"}</h2>
        </div>
        <div>
          <p>Total Contributors</p>
          <h2>{contributors.totalContributors ?? "N/A"}</h2>
        </div>
        <div>
          <p>Top Contributor</p>
          <h2>{contributors.topContributor ?? "N/A"}</h2>
        </div>
      </div>
    </div>
  );
};

export default ContributorPanel;