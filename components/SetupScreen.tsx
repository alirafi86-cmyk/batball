
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MatchSettings, Team, Player, Squad } from '../types';
import SquadManager from './SquadManager';

interface SetupScreenProps {
  onStart: (settings: MatchSettings) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart }) => {
  const [teamAName, setTeamAName] = useState('Home Team');
  const [teamBName, setTeamBName] = useState('Away Team');
  const [teamALogo, setTeamALogo] = useState<string | undefined>();
  const [teamBLogo, setTeamBLogo] = useState<string | undefined>();
  
  const [overs, setOvers] = useState(16);
  const [playerCount, setPlayerCount] = useState(11);
  const [retirementLimit, setRetirementLimit] = useState(8);
  const [matchPin, setMatchPin] = useState('1234');
  
  const [tossWinner, setTossWinner] = useState<'A' | 'B'>('A');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');

  // Club Roster persistence
  const [clubRoster, setClubRoster] = useState<Player[]>(() => {
    const saved = localStorage.getItem('club_roster');
    return saved ? JSON.parse(saved) : [];
  });

  const [teamAPlayers, setTeamAPlayers] = useState<Player[]>(Array(11).fill(null).map(() => ({ id: Math.random().toString(36).substr(2, 9), name: '' })));
  const [teamBPlayers, setTeamBPlayers] = useState<Player[]>(Array(11).fill(null).map(() => ({ id: Math.random().toString(36).substr(2, 9), name: '' })));
  
  const [showBulkPaste, setShowBulkPaste] = useState<{ active: boolean, team: 'A' | 'B' }>({ active: false, team: 'A' });
  const [bulkText, setBulkText] = useState('');
  const [activeSearch, setActiveSearch] = useState<{ team: 'A' | 'B', index: number } | null>(null);
  const [showSquadManager, setShowSquadManager] = useState(false);
  const [squadTeam, setSquadTeam] = useState<'A' | 'B'>('A');

  const fileInputA = useRef<HTMLInputElement>(null);
  const fileInputB = useRef<HTMLInputElement>(null);

  // Update roster in storage whenever it changes
  useEffect(() => {
    localStorage.setItem('club_roster', JSON.stringify(clubRoster));
  }, [clubRoster]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, team: 'A' | 'B') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (team === 'A') setTeamALogo(reader.result as string);
        else setTeamBLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlayerChange = (team: 'A' | 'B', index: number, name: string) => {
    const update = (prev: Player[]) => {
      const next = [...prev];
      next[index] = { ...next[index], name };
      return next;
    };
    if (team === 'A') setTeamAPlayers(update);
    else setTeamBPlayers(update);
    setActiveSearch({ team, index });
  };

  const selectFromRoster = (player: Player) => {
    if (!activeSearch) return;
    const { team, index } = activeSearch;
    const update = (prev: Player[]) => {
      const next = [...prev];
      next[index] = player;
      return next;
    };
    if (team === 'A') setTeamAPlayers(update);
    else setTeamBPlayers(update);
    setActiveSearch(null);
  };

  const parseBulk = () => {
    const names = bulkText.split('\n')
      .map(line => line.replace(/^\d+[\.\)\s-]+/, '').trim()) 
      .filter(line => line.length > 0);
    
    const newPlayers = names.map(name => {
      const existing = clubRoster.find(p => p.name.toLowerCase() === name.toLowerCase());
      return existing || { id: Math.random().toString(36).substr(2, 9), name };
    });

    if (showBulkPaste.team === 'A') {
      const next = [...teamAPlayers];
      newPlayers.slice(0, 11).forEach((p, i) => next[i] = p);
      setTeamAPlayers(next);
    } else {
      const next = [...teamBPlayers];
      newPlayers.slice(0, 11).forEach((p, i) => next[i] = p);
      setTeamBPlayers(next);
    }
    setShowBulkPaste({ active: false, team: 'A' });
    setBulkText('');
  };

  const handleStart = () => {
    // Fill empty names with defaults like A1, A2 or B1, B2
    const finalTeamA = teamAPlayers.slice(0, playerCount).map((p, i) => ({
      ...p,
      name: p.name.trim() || `A${i + 1}`
    }));
    const finalTeamB = teamBPlayers.slice(0, playerCount).map((p, i) => ({
      ...p,
      name: p.name.trim() || `B${i + 1}`
    }));

    // Register any real names to the club roster (ignoring defaults like A1)
    const realPlayers = [...finalTeamA, ...finalTeamB].filter(p => !p.name.match(/^[AB]\d+$/));
    const updatedRoster = [...clubRoster];
    realPlayers.forEach(p => {
      if (!updatedRoster.find(rp => rp.id === p.id)) {
        updatedRoster.push(p);
      }
    });
    setClubRoster(updatedRoster);

    const matchId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const teamAId = Math.random().toString(36).substr(2, 9);
    const teamBId = Math.random().toString(36).substr(2, 9);

    onStart({
      matchId,
      totalOvers: overs,
      playersPerTeam: playerCount,
      retirementLimit,
      scorerPin: matchPin,
      teamA: { id: teamAId, name: teamAName, logo: teamALogo, players: finalTeamA },
      teamB: { id: teamBId, name: teamBName, logo: teamBLogo, players: finalTeamB },
      tossWinner: tossWinner === 'A' ? teamAId : teamBId,
      tossDecision
    });
  };

  const searchResults = useMemo(() => {
    if (!activeSearch) return [];
    const { team, index } = activeSearch;
    const currentName = (team === 'A' ? teamAPlayers : teamBPlayers)[index].name.toLowerCase();
    if (!currentName) return [];
    return clubRoster.filter(p => p.name.toLowerCase().includes(currentName)).slice(0, 5);
  }, [activeSearch, teamAPlayers, teamBPlayers, clubRoster]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12 relative">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center">
          <i className="fas fa-sliders mr-3 text-emerald-600"></i> Match Config
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
            <label className="block text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Overs</label>
            <input type="number" value={overs} onChange={e => setOvers(parseInt(e.target.value) || 0)} className="w-full bg-transparent font-black text-xl text-emerald-900 outline-none" />
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
            <label className="block text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Squad</label>
            <input type="number" value={playerCount} onChange={e => setPlayerCount(parseInt(e.target.value) || 0)} className="w-full bg-transparent font-black text-xl text-emerald-900 outline-none" />
          </div>
          <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100">
            <label className="block text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Retire At</label>
            <input type="number" value={retirementLimit} onChange={e => setRetirementLimit(parseInt(e.target.value) || 0)} className="w-full bg-transparent font-black text-xl text-amber-900 outline-none" />
          </div>
          <div className="bg-gray-100 p-3 rounded-2xl border border-gray-200">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">PIN</label>
            <input 
              type="text" 
              maxLength={4}
              value={matchPin} 
              onChange={e => setMatchPin(e.target.value.replace(/\D/g, '').slice(0, 4))} 
              className="w-full bg-transparent font-black text-xl text-gray-800 outline-none placeholder:text-gray-300" 
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-50">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">The Toss</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[9px] font-black text-gray-500 uppercase">Winner</p>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setTossWinner('A')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition ${tossWinner === 'A' ? 'bg-[#004e35] text-white shadow-md' : 'text-gray-400'}`}>{teamAName || 'Team A'}</button>
                <button onClick={() => setTossWinner('B')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition ${tossWinner === 'B' ? 'bg-[#004e35] text-white shadow-md' : 'text-gray-400'}`}>{teamBName || 'Team B'}</button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-black text-gray-500 uppercase">Decision</p>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setTossDecision('bat')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition ${tossDecision === 'bat' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400'}`}>Bat</button>
                <button onClick={() => setTossDecision('bowl')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition ${tossDecision === 'bowl' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400'}`}>Bowl</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(['A', 'B'] as const).map(teamKey => (
        <div key={teamKey} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3 w-2/3">
              <button 
                onClick={() => (teamKey === 'A' ? fileInputA : fileInputB).current?.click()}
                className="w-12 h-12 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0 overflow-hidden relative group"
              >
                {(teamKey === 'A' ? teamALogo : teamBLogo) ? (
                  <img src={teamKey === 'A' ? teamALogo : teamBLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <i className="fas fa-camera text-gray-400 group-hover:text-emerald-500 transition"></i>
                )}
                <input type="file" hidden ref={teamKey === 'A' ? fileInputA : fileInputB} accept="image/*" onChange={(e) => handleLogoUpload(e, teamKey)} />
              </button>
              <input 
                className="text-2xl font-black text-gray-900 border-none outline-none w-full bg-transparent"
                value={teamKey === 'A' ? teamAName : teamBName}
                onChange={e => teamKey === 'A' ? setTeamAName(e.target.value) : setTeamBName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setSquadTeam(teamKey); setShowSquadManager(true); }} className="text-[9px] font-black uppercase tracking-widest bg-[#a1cf65] text-[#004e35] px-3 py-2 rounded-xl hover:bg-[#99c955] transition">
                <i className="fas fa-users mr-1"></i>Squad
              </button>
              <button onClick={() => setShowBulkPaste({ active: true, team: teamKey })} className="text-[9px] font-black uppercase tracking-widest bg-gray-100 px-3 py-2 rounded-xl">Bulk Add</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {(teamKey === 'A' ? teamAPlayers : teamBPlayers).slice(0, playerCount).map((p, i) => (
              <div key={i} className="relative">
                <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <span className="text-[9px] font-black text-gray-400 w-4">{i + 1}</span>
                  <input 
                    value={p.name} 
                    onChange={e => handlePlayerChange(teamKey, i, e.target.value)} 
                    onFocus={() => setActiveSearch({ team: teamKey, index: i })}
                    className="bg-transparent text-sm font-bold text-gray-900 outline-none w-full"
                    placeholder={`${teamKey}${i + 1} (Default)`}
                  />
                </div>
                {activeSearch?.team === teamKey && activeSearch?.index === i && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white z-[100] shadow-2xl rounded-2xl border border-gray-100 mt-1 overflow-hidden animate-fadeIn">
                    {searchResults.map(rp => (
                      <button key={rp.id} onClick={() => selectFromRoster(rp)} className="w-full p-3 text-left hover:bg-emerald-50 flex items-center justify-between group border-b border-gray-50 last:border-0">
                        <span className="font-bold text-xs text-gray-800">{rp.name}</span>
                        <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase font-black">Club Member</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={handleStart} className="w-full py-5 bg-[#004e35] text-white font-black text-lg rounded-[2.5rem] shadow-xl hover:bg-emerald-700 transition active:scale-[0.98] border-b-4 border-[#003d2a]">
        START MATCH <i className="fas fa-play-circle ml-2 text-[#a1cf65]"></i>
      </button>

      {showBulkPaste.active && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-2xl font-black mb-6 text-gray-900">Paste Player Names</h3>
            <textarea 
              autoFocus
              className="w-full h-48 p-4 bg-gray-50 border-2 border-gray-200 rounded-3xl outline-none font-bold text-gray-900"
              placeholder="Player 1&#10;Player 2&#10;..."
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
            />
            <div className="flex space-x-3 mt-6">
              <button onClick={() => setShowBulkPaste({ active: false, team: 'A' })} className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-gray-400">Cancel</button>
              <button onClick={parseBulk} className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for closing active search */}
      {activeSearch && <div className="fixed inset-0 z-[90]" onClick={() => setActiveSearch(null)}></div>}

      {showSquadManager && (
        <SquadManager
          onSquadSelect={(squad) => {
            if (squadTeam === 'A') {
              setTeamAPlayers([...squad.players, ...Array(playerCount - squad.players.length).fill(null).map((_, i) => ({
                id: `temp_${i}`,
                name: ''
              }))]);
              setTeamAName(squad.name);
            } else {
              setTeamBPlayers([...squad.players, ...Array(playerCount - squad.players.length).fill(null).map((_, i) => ({
                id: `temp_${i}`,
                name: ''
              }))]);
              setTeamBName(squad.name);
            }
            setShowSquadManager(false);
          }}
          onClose={() => setShowSquadManager(false)}
        />
      )}
    </div>
  );
};

export default SetupScreen;
