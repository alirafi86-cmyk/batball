import React, { useState } from 'react';
import { MatchSettings, Player } from '../types';

interface ManageSquadModalProps {
  settings: MatchSettings;
  onSave: (updatedSettings: MatchSettings) => void;
  onCancel: () => void;
}

const ManageSquadModal: React.FC<ManageSquadModalProps> = ({ settings, onSave, onCancel }) => {
  const [teamAPlayers, setTeamAPlayers] = useState<Player[]>(settings.teamA.players);
  const [teamBPlayers, setTeamBPlayers] = useState<Player[]>(settings.teamB.players);
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [error, setError] = useState('');

  const currentPlayers = activeTab === 'A' ? teamAPlayers : teamBPlayers;

  const handleAddPlayer = () => {
    setError('');
    
    if (!newPlayerName.trim()) {
      setError('Player name cannot be empty');
      return;
    }

    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPlayerName.trim()
    };

    if (activeTab === 'A') {
      setTeamAPlayers([...teamAPlayers, newPlayer]);
    } else {
      setTeamBPlayers([...teamBPlayers, newPlayer]);
    }

    setNewPlayerName('');
  };

  const handleRemovePlayer = (playerId: string) => {
    if (activeTab === 'A') {
      setTeamAPlayers(teamAPlayers.filter(p => p.id !== playerId));
    } else {
      setTeamBPlayers(teamBPlayers.filter(p => p.id !== playerId));
    }
  };

  const handleUpdatePlayer = (playerId: string, newName: string) => {
    if (activeTab === 'A') {
      setTeamAPlayers(teamAPlayers.map(p => p.id === playerId ? { ...p, name: newName } : p));
    } else {
      setTeamBPlayers(teamBPlayers.map(p => p.id === playerId ? { ...p, name: newName } : p));
    }
  };

  const handleSave = () => {
    setError('');

    // Validation: Ensure minimum players
    if (teamAPlayers.length < settings.playersPerTeam) {
      setError(`Team A needs at least ${settings.playersPerTeam} players (currently ${teamAPlayers.length})`);
      return;
    }

    if (teamBPlayers.length < settings.playersPerTeam) {
      setError(`Team B needs at least ${settings.playersPerTeam} players (currently ${teamBPlayers.length})`);
      return;
    }

    const updatedSettings: MatchSettings = {
      ...settings,
      teamA: { ...settings.teamA, players: teamAPlayers },
      teamB: { ...settings.teamB, players: teamBPlayers }
    };

    onSave(updatedSettings);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#004e35] text-white p-6 border-b">
          <h2 className="text-2xl font-bold">Manage Squad</h2>
          <p className="text-xs text-gray-200 mt-1">Add late-arriving players or manage squad</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('A')}
            className={`flex-1 py-3 font-semibold transition ${
              activeTab === 'A'
                ? 'bg-[#a1cf65] text-[#004e35] border-b-4 border-[#004e35]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {settings.teamA.name}
          </button>
          <button
            onClick={() => setActiveTab('B')}
            className={`flex-1 py-3 font-semibold transition ${
              activeTab === 'B'
                ? 'bg-[#a1cf65] text-[#004e35] border-b-4 border-[#004e35]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {settings.teamB.name}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Add player form */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-3">Add New Player</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                placeholder="Enter player name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#a1cf65]"
              />
              <button
                onClick={handleAddPlayer}
                className="bg-[#a1cf65] hover:bg-[#92b55a] text-[#004e35] font-bold py-2 px-4 rounded-lg transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* Player list */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">
              Squad ({currentPlayers.length} players, min required: {settings.playersPerTeam})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentPlayers.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No players in squad</p>
              ) : (
                currentPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-500 font-semibold text-sm w-6">{index + 1}.</span>
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => handleUpdatePlayer(player.id, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-[#a1cf65]"
                    />
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      disabled={currentPlayers.length <= settings.playersPerTeam}
                      className={`px-3 py-1 rounded font-semibold text-sm transition ${
                        currentPlayers.length <= settings.playersPerTeam
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
            {currentPlayers.length <= settings.playersPerTeam && (
              <p className="text-xs text-gray-500 mt-2">Cannot remove players below minimum required count</p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="sticky bottom-0 bg-gray-100 border-t p-6 flex gap-3">
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

export default ManageSquadModal;
