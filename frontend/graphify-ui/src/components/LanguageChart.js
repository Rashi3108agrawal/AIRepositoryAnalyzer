import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import './LanguageChart.css';

const LanguageChart = ({ languageData }) => {
  if (!languageData || languageData.length === 0) return null;

  return (
    <div className="card glass chartBox">
      <h3>Language Distribution</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={languageData} dataKey="value" outerRadius={90}>
            {languageData.map((_, i) => (
              <Cell key={i} fill={`hsl(${i * 70},70%,60%)`} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LanguageChart;