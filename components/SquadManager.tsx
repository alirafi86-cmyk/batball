import React, { useState, useEffect } from 'react';
import { Squad, Player } from '../types';

interface SquadManagerProps {
  onSquadSelect: (squad: Squad) => void;
  onClose: () => void;
}

const SquadManager: React.FC<SquadManagerProps> = ({ onSquadSelect, onClose }) => {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingSquadId, setEditingSquadId] = useState<string | null>(null);

  useEffect(() => {
    loadSquads();
  }, []);

  const loadSquads = () => {
    const savedSquads = JSON.parse(localStorage.getItem('squads') || '[]');
    setSquads(savedSquads);
  };

  const saveSquads = (updatedSquads: Squad[]) => {
    localStorage.setItem('squads', JSON.stringify(updatedSquads));
    setSquads(updatedSquads);
  };

  const handleCreateSquad = () => {
    if (!squadName.trim() || players.length === 0) {
      alert('Squad name and at least one player required');
      return;
    }

    const newSquad: Squad = {
      id: `squad_${Date.now()}`,
      name: squadName,
      players: players.sort((a, b) => a.name.localeCompare(b.name)),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (editingSquadId) {
      const updated = squads.map(s => s.id === editingSquadId ? newSquad : s);
      saveSquads(updated);
      setEditingSquadId(null);
    } else {
      saveSquads([...squads, newSquad]);
    }

    setSquadName('');
    setPlayers([]);
    setShowCreate(false);
  };

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    const player: Player = {
      id: `player_${Date.now()}`,
      name: newPlayerName.trim()
    };
    setPlayers([...players, player]);
    setNewPlayerName('');
  };

  const handleRemovePlayer = (playerId: string) => {
    setPlayers(players.filter(p => p.id !== playerId));
  };

  const handleEditSquad = (squad: Squad) => {
    setSquadName(squad.name);
    setPlayers(squad.players);
    setEditingSquadId(squad.id);
    setShowCreate(true);
  };

  const handleDeleteSquad = (squadId: string) => {
    if (confirm('Delete this squad?')) {
      saveSquads(squads.filter(s => s.id !== squadId));
    }
  };

  if (showCreate) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
          <h2 className="text-2xl font-black text-[#004e35] mb-4">
            {editingSquadId ? 'Edit Squad' : 'Create Squad'}
          </h2>

          <input
            type="text"
            placeholder="Squad name (e.g., 'Team A - 2026')"
            value={squadName}
            onChange={(e) => setSquadName(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl mb-4 font-bold"
          />

          <div className="space-y-3 mb-4">
            <h3 className="font-black text-[#004e35] text-sm">Players ({players.length})</h3>
            {players.map(player => (
              <div key={player.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-sm">{player.name}</span>
                <button
                  onClick={() => handleRemovePlayer(player.id)}
                  className="text-red-600 hover:bg-red-50 p-1 rounded text-xs font-black"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Player name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
              className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
            />
            <button
              onClick={handleAddPlayer}
              className="px-3 py-2 bg-[#a1cf65] text-[#004e35] rounded-lg font-black text-xs"
            >
              Add
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowCreate(false);
                setSquadName('');
                setPlayers([]);
                setEditingSquadId(null);
              }}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-black text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSquad}
              className="flex-1 px-4 py-3 bg-[#004e35] text-white rounded-xl font-black text-sm"
            >
              {editingSquadId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-[#004e35]">Select Squad</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">×</button>
        </div>

        {squads.length === 0 ? (
          <p className="text-gray-500 text-sm mb-6">No squads yet. Create one below.</p>
        ) : (
          <div className="space-y-3 mb-6">
            {squads.map(squad => (
              <div key={squad.id} className="border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-black text-[#004e35]">{squad.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold">
                      {squad.players.length} players
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSquad(squad)}
                      className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-black hover:bg-blue-100"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteSquad(squad.id)}
                      className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-black hover:bg-red-100"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  {squad.players.map(p => p.name).join(', ')}
                </p>
                <button
                  onClick={() => onSquadSelect(squad)}
                  className="w-full px-3 py-2 bg-[#a1cf65] text-[#004e35] rounded-lg font-black text-sm hover:bg-[#99c955]"
                >
                  Use This Squad
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowCreate(true)}
          className="w-full px-4 py-3 bg-[#004e35] text-white rounded-2xl font-black text-sm"
        >
          <i className="fas fa-plus mr-2"></i> New Squad
        </button>
      </div>
    </div>
  );
};

export default SquadManager;
