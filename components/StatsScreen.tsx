
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MatchRecord, BallType, WicketType, Player } from '../types';
import { ScorecardTable } from './ScorecardTable';

interface StatsScreenProps {
  records: MatchRecord[];
  initialMatch?: MatchRecord | null;
}

interface TeamStanding {
  name: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
}

interface PersonalStats {
  id: string;
  name: string;
  batting: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    outs: number;
    highScore: number;
    fifties: number;
    hundreds: number;
  };
  bowling: {
    overs: number;
    balls: number;
    runs: number;
    wickets: number;
    bestWickets: number;
    bestRuns: number;
  };
  matches: { date: number, team: string, vs: string, runs: number, wickets: number, runsConceded: number }[];
}

const StatsScreen: React.FC<StatsScreenProps> = ({ records, initialMatch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(initialMatch || null);
  const [viewTab, setViewTab] = useState<'leaderboard' | 'standings' | 'roster' | 'data'>('leaderboard');
  const [storageUsage, setStorageUsage] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const usage = JSON.stringify(localStorage).length;
    setStorageUsage(Math.round((usage / (5 * 1024 * 1024)) * 100));
  }, [records]);

  const clubRoster = useMemo<Player[]>(() => {
    const saved = localStorage.getItem('club_roster');
    return saved ? JSON.parse(saved) : [];
  }, []);

  const standings = useMemo(() => {
    const table: Record<string, TeamStanding> = {};
    records.forEach(rec => {
      const tA = rec.settings.teamA.name;
      const tB = rec.settings.teamB.name;
      if (!table[tA]) table[tA] = { name: tA, played: 0, won: 0, lost: 0, tied: 0, points: 0 };
      if (!table[tB]) table[tB] = { name: tB, played: 0, won: 0, lost: 0, tied: 0, points: 0 };
      table[tA].played += 1;
      table[tB].played += 1;
      if (rec.finalScore.runs > 0) {
        table[tA].won += 1;
        table[tA].points += 2;
        table[tB].lost += 1;
      }
    });
    return Object.values(table).sort((a, b) => b.points - a.points);
  }, [records]);

  const allPlayerStats = useMemo(() => {
    const stats: Record<string, PersonalStats> = {};
    clubRoster.forEach(p => {
      stats[p.id] = {
        id: p.id,
        name: p.name,
        batting: { runs: 0, balls: 0, fours: 0, sixes: 0, outs: 0, highScore: 0, fifties: 0, hundreds: 0 },
        bowling: { overs: 0, balls: 0, runs: 0, wickets: 0, bestWickets: -1, bestRuns: 999 },
        matches: []
      };
    });

    records.forEach(rec => {
      const matchContributions: Record<string, { runs: number, balls: number, wickets: number, runsConceded: number, isOut: boolean }> = {};
      rec.history.forEach(ball => {
        if (!matchContributions[ball.strikerId]) matchContributions[ball.strikerId] = { runs: 0, balls: 0, wickets: 0, runsConceded: 0, isOut: false };
        matchContributions[ball.strikerId].runs += ball.runs;
        if (ball.type === BallType.NORMAL) matchContributions[ball.strikerId].balls += 1;
        if (ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED) matchContributions[ball.strikerId].isOut = true;

        if (!matchContributions[ball.bowlerId]) matchContributions[ball.bowlerId] = { runs: 0, balls: 0, wickets: 0, runsConceded: 0, isOut: false };
        const ballCost = ball.runs + (ball.type !== BallType.NORMAL ? 1 : 0);
        matchContributions[ball.bowlerId].runsConceded += ballCost;
        if (ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED) matchContributions[ball.bowlerId].wickets += 1;
      });

      Object.entries(matchContributions).forEach(([pid, m]) => {
        if (!stats[pid]) return;
        const p = stats[pid];
        p.batting.runs += m.runs;
        p.batting.balls += m.balls;
        if (m.isOut) p.batting.outs += 1;
        if (m.runs > p.batting.highScore) p.batting.highScore = m.runs;
        if (m.runs >= 100) p.batting.hundreds += 1;
        else if (m.runs >= 50) p.batting.fifties += 1;
        p.bowling.wickets += m.wickets;
        p.bowling.runs += m.runsConceded;
        if (m.wickets > p.bowling.bestWickets || (m.wickets === p.bowling.bestWickets && m.runsConceded < p.bowling.bestRuns)) {
          p.bowling.bestWickets = m.wickets;
          p.bowling.bestRuns = m.runsConceded;
        }
        const isTeamA = rec.settings.teamA.players.some(tp => tp.id === pid);
        p.matches.push({
          date: rec.date,
          team: isTeamA ? rec.settings.teamA.name : rec.settings.teamB.name,
          vs: isTeamA ? rec.settings.teamB.name : rec.settings.teamA.name,
          runs: m.runs,
          wickets: m.wickets,
          runsConceded: m.runsConceded
        });
      });
    });
    return stats;
  }, [records, clubRoster]);

  const handleExportAll = () => {
    const data = { records, roster: clubRoster, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batball-full-club-archive.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const offloadMatchToCloud = async (rec: MatchRecord) => {
    const filename = `scorecard-${rec.settings.teamA.name}-${new Date(rec.date).toISOString().split('T')[0]}.json`;
    const blob = new Blob([JSON.stringify(rec, null, 2)], { type: 'application/json' });
    const file = new File([blob], filename, { type: 'application/json' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Club Archive File', text: `Scorecard for ${rec.settings.teamA.name}` });
      } catch (err) { console.error("Share failed", err); }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
    }
  };

  const deleteMatchLocally = (matchId: string) => {
    if (confirm("Purge from local phone storage? Ensure this is backed up to WhatsApp or Drive first!")) {
      const updated = records.filter(r => r.id !== matchId);
      localStorage.setItem('cricket_history', JSON.stringify(updated));
      window.location.reload();
    }
  };

  if (selectedMatch) {
    const isSharedFile = !records.some(r => r.id === selectedMatch.id);
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        <button onClick={() => setSelectedMatch(null)} className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">
          <i className="fas fa-arrow-left mr-2"></i> Close Scorecard
        </button>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-center relative overflow-hidden">
          {isSharedFile && <div className="absolute top-0 left-0 bg-blue-500 text-white text-[7px] font-black px-4 py-1 uppercase tracking-widest rotate-[-45deg] -ml-8 mt-2 w-32">Viewing Shared</div>}
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{new Date(selectedMatch.date).toLocaleDateString()}</p>
          <h2 className="text-3xl font-black text-gray-800">{selectedMatch.settings.teamA.name}</h2>
          <p className="text-4xl font-black text-emerald-700">{selectedMatch.finalScore.runs}/{selectedMatch.finalScore.wickets}</p>
          <div className="flex justify-center space-x-2 mt-4">
             <button onClick={() => offloadMatchToCloud(selectedMatch)} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-100 flex items-center">
               <i className="fas fa-share-nodes mr-2"></i> Post to Group
             </button>
             {!isSharedFile && (
               <button onClick={() => deleteMatchLocally(selectedMatch.id)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-red-100 flex items-center">
                 <i className="fas fa-trash-can mr-2"></i> Purge Local
               </button>
             )}
          </div>
        </div>
        <ScorecardTable 
          players={selectedMatch.settings.teamA.players} 
          opponentPlayers={selectedMatch.settings.teamB.players}
          history={selectedMatch.history} 
          teamName={selectedMatch.settings.teamA.name}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex bg-gray-200/50 p-1 rounded-2xl">
        <button onClick={() => setViewTab('leaderboard')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${viewTab === 'leaderboard' ? 'bg-[#004e35] text-white' : 'text-gray-500'}`}>Records</button>
        <button onClick={() => setViewTab('standings')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${viewTab === 'standings' ? 'bg-[#004e35] text-white' : 'text-gray-500'}`}>Table</button>
        <button onClick={() => setViewTab('data')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${viewTab === 'data' ? 'bg-[#004e35] text-white' : 'text-gray-500'}`}>Storage</button>
      </div>

      {viewTab === 'data' ? (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-gray-800 uppercase italic tracking-tighter mb-4">Device Storage</h3>
            <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden mb-2">
              <div className={`h-full transition-all duration-1000 ${storageUsage > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${storageUsage}%` }}></div>
            </div>
            <div className="flex justify-between text-[9px] font-black uppercase text-gray-400">
              <span>{storageUsage}% Used</span>
              <span>Local phone storage is for active scoring.</span>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
             <button onClick={handleExportAll} className="w-full py-5 bg-[#004e35] text-white rounded-3xl font-black uppercase tracking-widest flex items-center justify-center space-x-3">
                <i className="fas fa-download text-[#a1cf65]"></i><span>Backup All Data</span>
             </button>
          </div>
        </div>
      ) : viewTab === 'leaderboard' ? (
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none"><i className="fas fa-search text-gray-300"></i></div>
            <input type="text" placeholder="Search Local Archive..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm outline-none text-gray-900 font-bold" />
          </div>
          {records.filter(r => r.settings.teamA.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.settings.teamB.name.toLowerCase().includes(searchQuery.toLowerCase())).map(rec => (
            <div key={rec.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition group overflow-hidden">
               <div className="flex justify-between items-center cursor-pointer" onClick={() => setSelectedMatch(rec)}>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">{new Date(rec.date).toLocaleDateString()}</p>
                    <h4 className="text-lg font-black text-gray-800 group-hover:text-emerald-700 transition">{rec.settings.teamA.name}</h4>
                    <p className="text-xs text-gray-500">vs {rec.settings.teamB.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-700">{rec.finalScore.runs}/{rec.finalScore.wickets}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{rec.finalScore.overs} Ov</p>
                  </div>
               </div>
               <div className="flex justify-end space-x-4 mt-4 pt-4 border-t border-gray-50">
                  <button onClick={() => offloadMatchToCloud(rec)} className="text-[9px] font-black uppercase text-blue-500"><i className="fas fa-cloud-arrow-up mr-1"></i> Cloud Post</button>
                  <button onClick={() => deleteMatchLocally(rec.id)} className="text-[9px] font-black uppercase text-red-400"><i className="fas fa-trash-can mr-1"></i> Purge</button>
               </div>
            </div>
          ))}
          {records.length === 0 && <p className="text-center py-12 text-gray-400 italic">No matches stored on this device.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm animate-fadeIn">
           <table className="w-full text-left">
             <thead>
               <tr className="text-[9px] font-black text-gray-400 uppercase border-b border-gray-100">
                 <th className="px-6 py-4">Team</th>
                 <th className="px-3 py-4 text-center">P</th>
                 <th className="px-3 py-4 text-center">W</th>
                 <th className="px-6 py-4 text-right">Pts</th>
               </tr>
             </thead>
             <tbody>
               {standings.map((team) => (
                 <tr key={team.name} className="border-b border-gray-50 last:border-0 hover:bg-emerald-50 transition">
                   <td className="px-6 py-4 font-bold text-gray-900">{team.name}</td>
                   <td className="px-3 py-4 text-center font-bold text-gray-500">{team.played}</td>
                   <td className="px-3 py-4 text-center font-black text-emerald-600">{team.won}</td>
                   <td className="px-6 py-4 text-right"><span className="bg-[#004e35] text-white px-3 py-1 rounded-full font-black text-[10px]">{team.points}</span></td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

export default StatsScreen;
