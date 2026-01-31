import React, { useState } from 'react';
import { MatchSettings, Team } from '../types';

interface EditMatchSettingsModalProps {
  settings: MatchSettings;
  onSave: (updatedSettings: MatchSettings) => void;
  onCancel: () => void;
}

const EditMatchSettingsModal: React.FC<EditMatchSettingsModalProps> = ({ settings, onSave, onCancel }) => {
  const [totalOvers, setTotalOvers] = useState(settings.totalOvers);
  const [playersPerTeam, setPlayersPerTeam] = useState(settings.playersPerTeam);
  const [teamAName, setTeamAName] = useState(settings.teamA.name);
  const [teamBName, setTeamBName] = useState(settings.teamB.name);
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');

    // Validation
    if (totalOvers < 1) {
      setError('Total overs must be at least 1');
      return;
    }

    if (playersPerTeam < 2) {
      setError('Players per team must be at least 2');
      return;
    }

    if (playersPerTeam > settings.teamA.players.length || playersPerTeam > settings.teamB.players.length) {
      setError(`Cannot set players per team to ${playersPerTeam}. Available players: Team A: ${settings.teamA.players.length}, Team B: ${settings.teamB.players.length}`);
      return;
    }

    // Check if any player is no longer in the squad after reducing players
    if (playersPerTeam < settings.playersPerTeam) {
      const affectedPlayers = [
        ...settings.teamA.players.slice(playersPerTeam),
        ...settings.teamB.players.slice(playersPerTeam)
      ];
      console.warn('The following players are now excluded from squad:', affectedPlayers);
    }

    const updatedSettings: MatchSettings = {
      ...settings,
      totalOvers,
      playersPerTeam,
      teamA: { ...settings.teamA, name: teamAName },
      teamB: { ...settings.teamB, name: teamBName }
    };

    onSave(updatedSettings);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-[#004e35] mb-6">Edit Match Settings</h2>

        <div className="space-y-6">
          {/* Team Names */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Team A Name
            </label>
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#004e35] rounded-lg font-bold text-gray-800"
              placeholder="Team A"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Team B Name
            </label>
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#004e35] rounded-lg font-bold text-gray-800"
              placeholder="Team B"
            />
          </div>

          {/* Total Overs */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Total Overs
            </label>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setTotalOvers(Math.max(1, totalOvers - 1))}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg transition"
              >
                −
              </button>
              <input
                type="number"
                value={totalOvers}
                onChange={(e) => setTotalOvers(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-2 border-2 border-[#004e35] rounded-lg text-center font-bold text-lg"
              />
              <button
                onClick={() => setTotalOvers(totalOvers + 1)}
                className="bg-[#a1cf65] hover:bg-[#92b55a] text-[#004e35] font-bold py-2 px-4 rounded-lg transition"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Current: {settings.totalOvers} overs</p>
          </div>

          {/* Players Per Team */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Players Per Team
            </label>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setPlayersPerTeam(Math.max(2, playersPerTeam - 1))}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg transition"
              >
                −
              </button>
              <input
                type="number"
                value={playersPerTeam}
                onChange={(e) => setPlayersPerTeam(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-20 px-3 py-2 border-2 border-[#004e35] rounded-lg text-center font-bold text-lg"
              />
              <button
                onClick={() => setPlayersPerTeam(playersPerTeam + 1)}
                className="bg-[#a1cf65] hover:bg-[#92b55a] text-[#004e35] font-bold py-2 px-4 rounded-lg transition"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current: {settings.playersPerTeam} players | Max available: {Math.min(settings.teamA.players.length, settings.teamB.players.length)}
            </p>
          </div>

          {/* Summary of changes */}
          <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-[#a1cf65]">
            <p className="text-sm font-semibold text-gray-700 mb-2">Changes Summary:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {teamAName !== settings.teamA.name && (
                <li>• Team A: {settings.teamA.name} → {teamAName}</li>
              )}
              {teamBName !== settings.teamB.name && (
                <li>• Team B: {settings.teamB.name} → {teamBName}</li>
              )}
              {totalOvers !== settings.totalOvers && (
                <li>• Overs: {settings.totalOvers} → {totalOvers}</li>
              )}
              {playersPerTeam !== settings.playersPerTeam && (
                <li>• Players: {settings.playersPerTeam} → {playersPerTeam}</li>
              )}
              {totalOvers === settings.totalOvers && playersPerTeam === settings.playersPerTeam && teamAName === settings.teamA.name && teamBName === settings.teamB.name && (
                <li>No changes</li>
              )}
            </ul>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={error !== ''}
            className="flex-1 bg-[#004e35] hover:bg-[#003d2a] disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMatchSettingsModal;
