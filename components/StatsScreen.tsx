
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MatchRecord, BallType, WicketType, Player } from '../types';
import { ScorecardTable } from './ScorecardTable';
import ScorecardImage from './ScorecardImage';
import jsPDF from 'jspdf';

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
  const [showScorecardShare, setShowScorecardShare] = useState(false);
  const [showEditTeamNames, setShowEditTeamNames] = useState(false);
  const [editedTeamAName, setEditedTeamAName] = useState('');
  const [editedTeamBName, setEditedTeamBName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const usage = JSON.stringify(localStorage).length;
    setStorageUsage(Math.round((usage / (5 * 1024 * 1024)) * 100));
  }, [records]);

  useEffect(() => {
    if (selectedMatch) {
      setEditedTeamAName(selectedMatch.settings.teamA.name);
      setEditedTeamBName(selectedMatch.settings.teamB.name);
    }
  }, [selectedMatch]);

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

  const handleSaveTeamNames = () => {
    if (!selectedMatch) return;
    const updated = {
      ...selectedMatch,
      settings: {
        ...selectedMatch.settings,
        teamA: { ...selectedMatch.settings.teamA, name: editedTeamAName },
        teamB: { ...selectedMatch.settings.teamB, name: editedTeamBName }
      }
    };
    const updatedRecords = records.map(r => r.id === selectedMatch.id ? updated : r);
    localStorage.setItem('cricket_history', JSON.stringify(updatedRecords));
    setSelectedMatch(updated);
    setShowEditTeamNames(false);
  };

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

  const generateMatchPDF = (rec: MatchRecord) => {
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 15;
      const lineHeight = 7;
      const margin = 12;
      const contentWidth = pageWidth - 2 * margin;

      // Determine match number for the day
      const matchDate = new Date(rec.date).toLocaleDateString();
      const matchesOnDay = records.filter(r => new Date(r.date).toLocaleDateString() === matchDate);
      const matchNum = matchesOnDay.findIndex(m => m.id === rec.id) + 1;

      // Title
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${rec.settings.teamA.name} vs ${rec.settings.teamB.name}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // Date and Match Number
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} - Match ${matchNum}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Innings 1
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('INNINGS 1', margin, yPos);
      yPos += 6;

      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text(rec.settings.teamA.name, margin, yPos);
      pdf.setFontSize(20);
      pdf.setTextColor(0, 78, 53);
      const teamAScore = rec.finalScore.teamAScore?.runs || rec.finalScore.runs;
      const teamAWickets = rec.finalScore.teamAScore?.wickets || rec.finalScore.wickets;
      const teamAOvers = rec.finalScore.teamAScore?.overs || rec.finalScore.overs;
      pdf.text(`${teamAScore}/${teamAWickets}`, pageWidth - margin - 15, yPos, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      pdf.text(`(${teamAOvers} overs)`, pageWidth - margin - 15, yPos + 6, { align: 'right' });
      yPos += 15;

      // Innings 2
      if (rec.finalScore.teamBScore) {
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('INNINGS 2 (CHASE)', margin, yPos);
        yPos += 6;

        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text(rec.settings.teamB.name, margin, yPos);
        pdf.setFontSize(20);
        pdf.setTextColor(0, 78, 53);
        pdf.text(`${rec.finalScore.teamBScore.runs}/${rec.finalScore.teamBScore.wickets}`, pageWidth - margin - 15, yPos, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');
        pdf.text(`(${rec.finalScore.teamBScore.overs} overs)`, pageWidth - margin - 15, yPos + 6, { align: 'right' });
        yPos += 15;
      }

      // Result
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('RESULT', margin, yPos);
      yPos += 6;
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Winner: ${rec.finalScore.winner || 'TBD'}`, margin, yPos);
      yPos += 12;

      // Batting Stats - Team A
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${rec.settings.teamA.name} - BATTING`, margin, yPos);
      yPos += 5;

      const inningsOneHistory = rec.history.filter(b => b.innings === 1);
      const battingData: any[] = [];
      rec.settings.teamA.players.forEach(p => {
        const playerHistory = inningsOneHistory.filter(b => b.strikerId === p.id);
        if (playerHistory.length > 0) {
          const runs = playerHistory.reduce((sum, b) => sum + b.runs, 0);
          const balls = playerHistory.filter(b => b.type === BallType.NORMAL).length;
          battingData.push([p.name, runs.toString(), balls.toString()]);
        }
      });

      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      battingData.slice(0, 6).forEach(row => {
        if (yPos > pageHeight - 15) {
          pdf.addPage();
          yPos = 15;
        }
        pdf.text(`${row[0]}: ${row[1]} (${row[2]} balls)`, margin, yPos);
        yPos += 4;
      });

      yPos += 5;

      // Bowling Stats - Team B
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${rec.settings.teamB.name} - BOWLING`, margin, yPos);
      yPos += 5;

      const bowlingData: any[] = [];
      rec.settings.teamB.players.forEach(p => {
        const playerHistory = inningsOneHistory.filter(b => b.bowlerId === p.id);
        if (playerHistory.length > 0) {
          const runs = playerHistory.reduce((sum, b) => sum + b.runs + (b.type !== BallType.NORMAL ? 1 : 0), 0);
          const wickets = playerHistory.filter(b => b.wicket !== WicketType.NONE && b.wicket !== WicketType.RETIRED).length;
          const balls = playerHistory.filter(b => b.type === BallType.NORMAL).length;
          bowlingData.push([p.name, wickets.toString(), runs.toString(), balls.toString()]);
        }
      });

      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      bowlingData.slice(0, 6).forEach(row => {
        if (yPos > pageHeight - 15) {
          pdf.addPage();
          yPos = 15;
        }
        pdf.text(`${row[0]}: ${row[1]}/w, ${row[2]} runs (${row[3]} balls)`, margin, yPos);
        yPos += 4;
      });

      const filename = `${rec.settings.teamA.name}-vs-${rec.settings.teamB.name}-${new Date(rec.date).toISOString().split('T')[0]}-match${matchNum}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF');
    }
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
    const inningsOneHistory = selectedMatch.history.filter(b => b.innings === 1);
    const inningsTwoHistory = selectedMatch.history.filter(b => b.innings === 2);
    
    // Calculate match number (for same day, same teams)
    const selectedMatchDate = new Date(selectedMatch.date).toLocaleDateString();
    const matchesOnSameDay = records.filter(r => 
      new Date(r.date).toLocaleDateString() === selectedMatchDate &&
      r.settings.teamA.name === selectedMatch.settings.teamA.name &&
      r.settings.teamB.name === selectedMatch.settings.teamB.name
    );
    const matchNumber = matchesOnSameDay.findIndex(m => m.id === selectedMatch.id) + 1;
    
    // Share scorecard modal
    if (showScorecardShare) {
      const handleShareImage = async () => {
        const scoreboardRef = document.querySelector('[data-scorecard-image]') as HTMLElement;
        if (!scoreboardRef) return;

        try {
          const html2Canvas = (await import('html2canvas')).default;
          const canvas = await html2Canvas(scoreboardRef, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false
          });
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob && navigator.share) {
            const file = new File([blob as BlobPart], `batball-scorecard.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: 'Batball Scorecard', text: 'Match scorecard ready to share.' });
            } else {
              alert('Image copied to clipboard - paste in WhatsApp');
            }
          }
        } catch (err) {
          console.error('Error sharing image:', err);
          alert('Unable to share scorecard image');
        }
      };

      const handleDownloadImage = async () => {
        const scoreboardRef = document.querySelector('[data-scorecard-image]') as HTMLElement;
        if (!scoreboardRef) return;

        try {
          const html2Canvas = (await import('html2canvas')).default;
          const canvas = await html2Canvas(scoreboardRef, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false
          });
          const image = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = image;
          link.download = `scorecard-${new Date().toISOString().split('T')[0]}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          console.error('Error downloading image:', err);
          alert('Failed to download scorecard image');
        }
      };

      return (
        <div className="fixed inset-0 bg-black/70 z-[300] flex flex-col overflow-y-auto p-4">
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-black/70 py-2">
            <h2 className="text-white font-black text-lg">Share Scorecard</h2>
            <button
              onClick={() => setShowScorecardShare(false)}
              className="text-white text-3xl hover:opacity-70 transition"
            >
              ×
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center mb-4">
            <ScorecardImage
              record={{
                id: 'temp',
                date: Date.now(),
                settings: selectedMatch.settings,
                history: selectedMatch.history,
                finalScore: selectedMatch.finalScore
              }}
              type="full"
              matchNumber={matchNumber}
              onShare={() => handleShareImage()}
              onDownload={() => handleDownloadImage()}
            />
          </div>
          <div className="flex gap-3 sticky bottom-0 bg-black/70 py-2">
            <button
              onClick={handleShareImage}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center space-x-2 hover:bg-blue-700 transition"
            >
              <i className="fas fa-share-nodes"></i>
              <span>Share Image</span>
            </button>
            <button
              onClick={handleDownloadImage}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center space-x-2 hover:bg-emerald-700 transition"
            >
              <i className="fas fa-download"></i>
              <span>Download Image</span>
            </button>
            <button
              onClick={() => setShowScorecardShare(false)}
              className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center space-x-2"
            >
              <i className="fas fa-times"></i>
              <span>Close</span>
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        <button onClick={() => setSelectedMatch(null)} className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">
          <i className="fas fa-arrow-left mr-2"></i> Close Scorecard
        </button>

        {/* Team A Score Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-emerald-100 text-center relative overflow-hidden">
          {isSharedFile && <div className="absolute top-0 left-0 bg-blue-500 text-white text-[7px] font-black px-4 py-1 uppercase tracking-widest rotate-[-45deg] -ml-8 mt-2 w-32">Viewing Shared</div>}
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{new Date(selectedMatch.date).toLocaleDateString()}</p>
          <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Innings 1</h2>
          <h3 className="text-3xl font-black text-gray-800 mb-1">{selectedMatch.settings.teamA.name}</h3>
          <p className="text-4xl font-black text-emerald-700 mb-2">
            {selectedMatch.finalScore.teamAScore?.runs || selectedMatch.finalScore.runs}/{selectedMatch.finalScore.teamAScore?.wickets || selectedMatch.finalScore.wickets}
            <span className="text-lg text-gray-400 font-normal ml-2">({selectedMatch.finalScore.teamAScore?.overs || selectedMatch.finalScore.overs})</span>
          </p>
        </div>

        {/* Team B Score Card */}
        {selectedMatch.finalScore.teamBScore && (
          <div className="bg-blue-50 p-8 rounded-[2.5rem] shadow-sm border border-blue-100 text-center relative overflow-hidden">
            <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Innings 2 (Chase)</h2>
            <h3 className="text-3xl font-black text-gray-800 mb-1">{selectedMatch.settings.teamB.name}</h3>
            <p className="text-4xl font-black text-blue-700 mb-2">
              {selectedMatch.finalScore.teamBScore.runs}/{selectedMatch.finalScore.teamBScore.wickets}
              <span className="text-lg text-gray-400 font-normal ml-2">({selectedMatch.finalScore.teamBScore.overs})</span>
            </p>
            <p className="text-sm font-bold text-blue-600 mt-2">Target: {(selectedMatch.finalScore.teamAScore?.runs || selectedMatch.finalScore.runs) + 1}</p>
          </div>
        )}

        {/* Result */}
        {selectedMatch.finalScore.winner && (
          <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 text-center">
            <p className="text-sm font-black text-amber-900 uppercase tracking-widest mb-1">🏆 Match Winner</p>
            <p className="text-2xl font-black text-amber-700">{selectedMatch.finalScore.winner}</p>
          </div>
        )}

        <div className="flex justify-center space-x-2 flex-wrap gap-2">
           <button onClick={() => setShowScorecardShare(true)} className="bg-[#a1cf65] text-[#004e35] px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-[#99c955] flex items-center hover:bg-[#99c955] transition">
             <i className="fas fa-image mr-2"></i> Share Scorecard
           </button>
           <button onClick={() => setShowEditTeamNames(true)} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-blue-100 flex items-center hover:bg-blue-100 transition">
             <i className="fas fa-edit mr-2"></i> Edit Team Names
           </button>
           <button onClick={() => offloadMatchToCloud(selectedMatch)} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-100 flex items-center">
             <i className="fas fa-share-nodes mr-2"></i> Post to Group
           </button>
           {!isSharedFile && (
             <button onClick={() => deleteMatchLocally(selectedMatch.id)} className="bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-gray-100 flex items-center">
               <i className="fas fa-trash-can mr-2"></i> Purge Local
             </button>
           )}
        </div>

        <ScorecardTable 
          players={selectedMatch.settings.teamA.players} 
          opponentPlayers={selectedMatch.settings.teamB.players}
          history={inningsOneHistory} 
          teamName={selectedMatch.settings.teamA.name}
        />

        {inningsTwoHistory.length > 0 && (
          <ScorecardTable 
            players={selectedMatch.settings.teamB.players} 
            opponentPlayers={selectedMatch.settings.teamA.players}
            history={inningsTwoHistory} 
            teamName={selectedMatch.settings.teamB.name}
          />
        )}

        {showEditTeamNames && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] max-w-sm w-full p-6 shadow-xl animate-scaleIn">
              <h3 className="text-2xl font-black text-gray-800 mb-6 uppercase italic tracking-tighter">Edit Team Names</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2 uppercase">Team A</label>
                  <input
                    type="text"
                    value={editedTeamAName}
                    onChange={(e) => setEditedTeamAName(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-emerald-200 rounded-lg font-bold text-gray-800 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2 uppercase">Team B</label>
                  <input
                    type="text"
                    value={editedTeamBName}
                    onChange={(e) => setEditedTeamBName(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg font-bold text-gray-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditTeamNames(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-black py-3 rounded-lg uppercase text-[10px] tracking-widest hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTeamNames}
                  className="flex-1 bg-emerald-600 text-white font-black py-3 rounded-lg uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
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
                    <div className="mb-2">
                      <p className="text-lg font-black text-emerald-700">
                        {rec.finalScore.teamAScore?.runs || rec.finalScore.runs}/{rec.finalScore.teamAScore?.wickets || rec.finalScore.wickets}
                      </p>
                      {rec.finalScore.teamBScore && (
                        <p className="text-lg font-black text-blue-700">
                          {rec.finalScore.teamBScore.runs}/{rec.finalScore.teamBScore.wickets}
                        </p>
                      )}
                    </div>
                    {rec.finalScore.winner && (
                      <p className="text-[10px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-1 rounded inline-block">
                        🏆 {rec.finalScore.winner}
                      </p>
                    )}
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
