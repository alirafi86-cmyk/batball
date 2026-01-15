import React from 'react';
import { MatchRecord } from '../types';

interface DataExportProps {
  records: MatchRecord[];
}

const DataExport: React.FC<DataExportProps> = ({ records }) => {
  const handleExportJSON = () => {
    // Remove scorer PIN from exported data for security
    const sanitizedRecords = records.map(record => ({
      ...record,
      settings: {
        ...record.settings,
        scorerPin: undefined
      }
    }));

    const dataToExport = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      totalMatches: sanitizedRecords.length,
      matches: sanitizedRecords
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batball-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    let csv = 'Match Date,Team A,Team B,Team A Score,Team A Wickets,Winner\n';
    
    records.forEach(record => {
      const date = new Date(record.date).toLocaleDateString();
      const teamA = record.settings.teamA.name;
      const teamB = record.settings.teamB.name;
      const score = `${record.finalScore.runs}/${record.finalScore.wickets}`;
      const winner = record.finalScore.winner || 'N/A';
      csv += `"${date}","${teamA}","${teamB}","${score}","${record.finalScore.overs}","${winner}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batball-summary-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearAllData = () => {
    if (window.confirm('⚠️ This will delete ALL match records permanently. Are you sure?')) {
      if (window.confirm('Really? This cannot be undone!')) {
        localStorage.removeItem('cricket_history');
        localStorage.removeItem('active_match_settings');
        localStorage.removeItem('active_match_state');
        localStorage.removeItem('club_roster');
        window.location.reload();
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
      <h3 className="text-lg font-bold text-[#004e35]">Data Management</h3>
      
      <div className="space-y-3">
        <button
          onClick={handleExportJSON}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
        >
          <i className="fas fa-file-json"></i>
          <span>Export as JSON</span>
        </button>

        <button
          onClick={handleExportCSV}
          className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
        >
          <i className="fas fa-file-csv"></i>
          <span>Export as CSV</span>
        </button>

        <button
          onClick={handleClearAllData}
          className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
        >
          <i className="fas fa-trash"></i>
          <span>Clear All Data</span>
        </button>

        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <p className="font-semibold text-gray-700">Total Matches Stored: {records.length}</p>
          <p className="text-xs mt-2">
            💾 Data is stored locally on this device. Export regularly to back up your records!
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataExport;
