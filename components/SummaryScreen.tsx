
import React, { useMemo, useState } from 'react';
import { MatchSettings, BallEvent, WicketType, BallType, MatchRecord } from '../types';
import { ScorecardTable } from './ScorecardTable';
import ScorecardImage from './ScorecardImage';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface SummaryScreenProps {
  settings: MatchSettings;
  history: BallEvent[];
  onSave: (record: MatchRecord) => void;
  onBackToSetup: () => void;
}

const SummaryScreen: React.FC<SummaryScreenProps> = ({ settings, history, onSave, onBackToSetup }) => {
  const [copied, setCopied] = useState(false);
  const [showScorecard, setShowScorecard] = useState<'summary' | 'full' | null>(null);

  const inningsOneHistory = useMemo(() => history.filter(b => b.innings === 1), [history]);
  const inningsTwoHistory = useMemo(() => history.filter(b => b.innings === 2), [history]);

  const stats = useMemo(() => {
    // Calculate stats for the batting team (innings 1) only for SummaryScreen
    let totalScore = 0;
    let totalWickets = 0;
    
    inningsOneHistory.forEach(ball => {
      totalScore += ball.runs + (ball.type !== BallType.NORMAL ? 1 : 0);
      if (ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED) {
        totalWickets += 1;
      }
    });
    return { totalScore, totalWickets };
  }, [inningsOneHistory]);

  const overCount = `${Math.floor(inningsOneHistory.filter(b => b.type === BallType.NORMAL).length / 6)}.${inningsOneHistory.filter(b => b.type === BallType.NORMAL).length % 6}`;

  const handleShareText = () => {
    // Calculate both innings for share text
    let teamAScore = 0, teamAWickets = 0;
    let teamBScore = 0, teamBWickets = 0;
    
    history.forEach(ball => {
      const runValue = ball.runs + (ball.type !== BallType.NORMAL ? 1 : 0);
      const isWicket = ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED;
      
      if (ball.innings === 1) {
        teamAScore += runValue;
        if (isWicket) teamAWickets += 1;
      } else {
        teamBScore += runValue;
        if (isWicket) teamBWickets += 1;
      }
    });
    
    const teamABalls = history.filter(b => b.innings === 1 && b.type === BallType.NORMAL).length;
    const teamBBalls = history.filter(b => b.innings === 2 && b.type === BallType.NORMAL).length;
    const teamAOvers = `${Math.floor(teamABalls / 6)}.${teamABalls % 6}`;
    const teamBOvers = `${Math.floor(teamBBalls / 6)}.${teamBBalls % 6}`;
    
    let resultText = '';
    if (teamBScore > teamAScore) {
      resultText = `🏆 ${settings.teamB.name} WINS!`;
    } else if (teamAScore > teamBScore) {
      resultText = `🏆 ${settings.teamA.name} WINS!`;
    } else {
      resultText = `🤝 TIE MATCH!`;
    }

    // Calculate recap text
    const matchWinner = teamBScore > teamAScore ? settings.teamB.name : (teamAScore > teamBScore ? settings.teamA.name : 'Tie');
    const firstInningsLine = `${settings.teamA.name} posted ${teamAScore}/${teamAWickets} in ${teamAOvers} overs.`;
    const secondInningsLine = inningsTwoHistory.length > 0
      ? `${settings.teamB.name} replied with ${teamBScore}/${teamBWickets} in ${teamBOvers} overs.`
      : `${settings.teamB.name} is yet to bat.`;
    const resultLine = matchWinner === 'Tie' ? 'Match tied.' : `${matchWinner} take the game.`;
    const recapText = `${firstInningsLine} ${secondInningsLine} ${resultLine}`;
    
    const text = `🏏 *BATBALL MATCH RESULT*\n\n*${settings.teamA.name} vs ${settings.teamB.name}*\n\n📊 *SCORE:*\n${settings.teamA.name}: ${teamAScore}/${teamAWickets} (${teamAOvers})\n${settings.teamB.name}: ${teamBScore}/${teamBWickets} (${teamBOvers})\n\n${resultText}\n\n📝 *RECAP:*\n${recapText}\n\n_Scored with Batball_`;
    
    if (navigator.share) {
      navigator.share({ title: 'Match Result', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloudBackup = async () => {
    // Calculate both innings scores and determine winner
    let teamAScore = 0, teamAWickets = 0;
    let teamBScore = 0, teamBWickets = 0;
    
    history.forEach(ball => {
      const runValue = ball.runs + (ball.type !== BallType.NORMAL ? 1 : 0);
      const isWicket = ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED;
      
      if (ball.innings === 1) {
        teamAScore += runValue;
        if (isWicket) teamAWickets += 1;
      } else {
        teamBScore += runValue;
        if (isWicket) teamBWickets += 1;
      }
    });
    
    const teamAOvers = `${Math.floor(history.filter(b => b.innings === 1 && b.type === BallType.NORMAL).length / 6)}.${history.filter(b => b.innings === 1 && b.type === BallType.NORMAL).length % 6}`;
    const teamBOvers = `${Math.floor(history.filter(b => b.innings === 2 && b.type === BallType.NORMAL).length / 6)}.${history.filter(b => b.innings === 2 && b.type === BallType.NORMAL).length % 6}`;
    
    let winner = undefined;
    if (teamBScore > teamAScore) {
      winner = settings.teamB.name;
    } else if (teamAScore > teamBScore) {
      winner = settings.teamA.name;
    }
    
    const record: MatchRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: Date.now(),
      settings,
      history,
      finalScore: { 
        runs: stats.totalScore, 
        wickets: stats.totalWickets, 
        overs: overCount,
        target: teamAScore + 1,
        winner: winner,
        teamAScore: { runs: teamAScore, wickets: teamAWickets, overs: teamAOvers },
        teamBScore: teamBScore > 0 ? { runs: teamBScore, wickets: teamBWickets, overs: teamBOvers } : undefined
      }
    };
    const filename = `match-data-${settings.teamA.name}.json`;
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const file = new File([blob], filename, { type: 'application/json' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Backup Match Data',
          text: 'Save this match file to Google Drive or OneDrive for offloading storage.'
        });
      } catch (err) {
        console.error("Cloud share failed", err);
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    }
  };

  const downloadScorecardImage = async () => {
    const element = document.querySelector('[data-scorecard-image]');
    if (!element) return;

    try {
      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `batball-${showScorecard || 'scorecard'}-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error generating image:', err);
      alert('Failed to generate scorecard image');
    }
  };

  const shareScorecardImage = async () => {
    const element = document.querySelector('[data-scorecard-image]');
    if (!element) return;

    try {
      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], `batball-${showScorecard || 'scorecard'}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Batball Scorecard', text: 'Match scorecard ready to share.' });
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          return;
        }
      }

      // Fallback to download
      await downloadScorecardImage();
    } catch (err) {
      console.error('Error sharing image:', err);
      alert('Unable to share scorecard image');
    }
  };

  const generatePDF = async () => {
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 15;
      const lineHeight = 7;
      const margin = 12;
      const contentWidth = pageWidth - 2 * margin;

      // Title
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text('BATBALL MATCH SCORECARD', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Date
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // Team A Section
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('INNINGS 1', margin, yPos);
      yPos += 6;

      pdf.setFontSize(14);
      pdf.text(settings.teamA.name, margin, yPos);
      pdf.setFontSize(24);
      pdf.setTextColor(0, 78, 53);
      pdf.text(`${teamAStats.score}/${teamAStats.wickets}`, pageWidth - margin - 20, yPos, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`(${teamAStats.overs} overs)`, pageWidth - margin - 20, yPos + 6, { align: 'right' });
      yPos += 15;

      // Team B Section
      if (inningsTwoHistory.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('INNINGS 2 (CHASE)', margin, yPos);
        yPos += 6;

        pdf.setFontSize(14);
        pdf.text(settings.teamB.name, margin, yPos);
        pdf.setFontSize(24);
        pdf.setTextColor(0, 78, 53);
        pdf.text(`${teamBStats.score}/${teamBStats.wickets}`, pageWidth - margin - 20, yPos, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.text(`(${teamBStats.overs} overs)`, pageWidth - margin - 20, yPos + 6, { align: 'right' });
        yPos += 15;
      }

      // Result
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('MATCH RESULT', margin, yPos);
      yPos += 6;
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Winner: ${matchWinner}`, margin, yPos);
      yPos += 10;

      // Batting Stats
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${settings.teamA.name} - BATTING`, margin, yPos);
      yPos += 6;

      const battingData: any[] = [];
      settings.teamA.players.forEach(p => {
        const playerHistory = inningsOneHistory.filter(b => b.strikerId === p.id);
        if (playerHistory.length > 0) {
          const runs = playerHistory.reduce((sum, b) => sum + b.runs, 0);
          const balls = playerHistory.filter(b => b.type === BallType.NORMAL).length;
          battingData.push([p.name, runs.toString(), balls.toString(), ((runs / balls) * 100).toFixed(1)]);
        }
      });

      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      battingData.slice(0, 5).forEach(row => {
        if (yPos > pageHeight - 15) {
          pdf.addPage();
          yPos = 15;
        }
        pdf.text(`${row[0]}: ${row[1]} (${row[2]} balls)`, margin, yPos);
        yPos += 5;
      });

      yPos += 5;

      // Bowling Stats
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${settings.teamB.name} - BOWLING`, margin, yPos);
      yPos += 6;

      const bowlingData: any[] = [];
      settings.teamB.players.forEach(p => {
        const playerHistory = inningsOneHistory.filter(b => b.bowlerId === p.id);
        if (playerHistory.length > 0) {
          const runs = playerHistory.reduce((sum, b) => sum + b.runs + (b.type !== BallType.NORMAL ? 1 : 0), 0);
          const wickets = playerHistory.filter(b => b.wicket !== WicketType.NONE && b.wicket !== WicketType.RETIRED).length;
          const balls = playerHistory.filter(b => b.type === BallType.NORMAL).length;
          const overs = Math.floor(balls / 6) + (balls % 6) / 10;
          bowlingData.push([p.name, wickets.toString(), runs.toString(), overs.toFixed(1)]);
        }
      });

      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      bowlingData.slice(0, 5).forEach(row => {
        if (yPos > pageHeight - 15) {
          pdf.addPage();
          yPos = 15;
        }
        pdf.text(`${row[0]}: ${row[1]}/w, ${row[2]} runs (${row[3]} overs)`, margin, yPos);
        yPos += 5;
      });

      const filename = `batball-${settings.teamA.name}-vs-${settings.teamB.name}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF');
    }
  };

  // Calculate both innings for complete match summary
  const teamAStats = (() => {
    let score = 0, wickets = 0, balls = 0;
    history.forEach(ball => {
      if (ball.innings === 1) {
        score += ball.runs + (ball.type !== BallType.NORMAL ? 1 : 0);
        if (ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED) wickets += 1;
        if (ball.type === BallType.NORMAL) balls += 1;
      }
    });
    return { score, wickets, overs: `${Math.floor(balls / 6)}.${balls % 6}` };
  })();
  
  const teamBStats = (() => {
    let score = 0, wickets = 0, balls = 0;
    history.forEach(ball => {
      if (ball.innings === 2) {
        score += ball.runs + (ball.type !== BallType.NORMAL ? 1 : 0);
        if (ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED) wickets += 1;
        if (ball.type === BallType.NORMAL) balls += 1;
      }
    });
    return { score, wickets, overs: `${Math.floor(balls / 6)}.${balls % 6}` };
  })();
  
  const matchWinner = teamBStats.score > teamAStats.score ? settings.teamB.name : (teamAStats.score > teamBStats.score ? settings.teamA.name : 'Tie');

  const recapText = useMemo(() => {
    const firstInningsLine = `${settings.teamA.name} posted ${teamAStats.score}/${teamAStats.wickets} in ${teamAStats.overs} overs.`;
    const secondInningsLine = inningsTwoHistory.length > 0
      ? `${settings.teamB.name} replied with ${teamBStats.score}/${teamBStats.wickets} in ${teamBStats.overs} overs.`
      : `${settings.teamB.name} is yet to bat.`;
    const resultLine = matchWinner === 'Tie' ? 'Match tied.' : `${matchWinner} take the game.`;
    return `${firstInningsLine} ${secondInningsLine} ${resultLine}`;
  }, [settings.teamA.name, settings.teamB.name, teamAStats, teamBStats, inningsTwoHistory.length, matchWinner]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Team A (Innings 1) Score Card */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-emerald-100 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
           <button onClick={handleCloudBackup} className="text-[#a1cf65] hover:text-[#004e35] transition flex flex-col items-center" title="Cloud Backup">
              <i className="fas fa-cloud-arrow-up text-xl"></i>
              <span className="text-[7px] font-black uppercase mt-1">Offload</span>
           </button>
        </div>
        <div className="flex justify-center mb-4">
          {settings.teamA.logo && (
            <img src={settings.teamA.logo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500" />
          )}
        </div>
        <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Innings 1</h2>
        <h3 className="text-3xl font-black text-gray-800 mb-1">{settings.teamA.name}</h3>
        <p className="text-5xl font-black text-emerald-700 mb-4">{teamAStats.score}/{teamAStats.wickets} <span className="text-xl text-gray-400 font-normal">({teamAStats.overs})</span></p>
      </div>
      
      {/* Team B (Innings 2) Score Card */}
      {teamBStats.score > 0 || history.some(b => b.innings === 2) ? (
        <div className="bg-blue-50 p-8 rounded-[2.5rem] shadow-sm border border-blue-100 text-center relative overflow-hidden">
          <div className="flex justify-center mb-4">
            {settings.teamB.logo && (
              <img src={settings.teamB.logo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-blue-500" />
            )}
          </div>
          <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Innings 2 (Chase)</h2>
          <h3 className="text-3xl font-black text-gray-800 mb-1">{settings.teamB.name}</h3>
          <p className="text-5xl font-black text-blue-700 mb-4">{teamBStats.score}/{teamBStats.wickets} <span className="text-xl text-gray-400 font-normal">({teamBStats.overs})</span></p>
          <p className="text-sm font-bold text-blue-600 mt-2">Target: {teamAStats.score + 1}</p>
        </div>
      ) : null}
      
      {/* Match Result */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-8 rounded-[2.5rem] shadow-md border-2 border-amber-200 text-center">
        <h2 className="text-2xl font-black text-amber-900 uppercase tracking-tighter mb-2">🏆 Match Result</h2>
        <p className="text-3xl font-black text-amber-700">{matchWinner} Wins!</p>
        <p className="text-sm font-bold text-amber-600 mt-2">{teamAStats.score} vs {teamBStats.score}</p>
      </div>

      <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 relative">
        <h4 className="font-black text-emerald-800 mb-2 flex items-center text-[10px] uppercase tracking-widest"><i className="fas fa-newspaper mr-2"></i> Match Recap</h4>
        <p className="text-gray-700 italic leading-relaxed text-sm">{recapText}</p>
        
        <button onClick={handleShareText} className="absolute top-4 right-4 bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition">
           <i className={`fas ${copied ? 'fa-check' : 'fa-share-nodes'}`}></i>
        </button>
      </div>

      <ScorecardTable 
        players={settings.teamA.players} 
        opponentPlayers={settings.teamB.players}
        history={inningsOneHistory} 
        teamName={settings.teamA.name}
      />

      {inningsTwoHistory.length > 0 && (
        <ScorecardTable 
          players={settings.teamB.players} 
          opponentPlayers={settings.teamA.players}
          history={inningsTwoHistory} 
          teamName={settings.teamB.name}
        />
      )}

      <div className="flex flex-col space-y-3">
        <button onClick={() => {
          const winner = teamBStats.score > teamAStats.score ? settings.teamB.name : (teamAStats.score > teamBStats.score ? settings.teamA.name : undefined);
          onSave({
            id: Math.random().toString(36).substr(2, 9),
            date: Date.now(),
            settings,
            history,
            finalScore: {
              runs: teamAStats.score,
              wickets: teamAStats.wickets,
              overs: teamAStats.overs,
              target: teamAStats.score + 1,
              winner,
              teamAScore: { runs: teamAStats.score, wickets: teamAStats.wickets, overs: teamAStats.overs },
              teamBScore: inningsTwoHistory.length > 0 ? { runs: teamBStats.score, wickets: teamBStats.wickets, overs: teamBStats.overs } : undefined
            }
          });
        }} className="w-full py-5 bg-[#004e35] text-white font-black text-lg rounded-[2.5rem] shadow-xl hover:bg-emerald-700 transition flex items-center justify-center space-x-3">
          <i className="fas fa-floppy-disk text-[#a1cf65]"></i>
          <span>SAVE TO CLUB HUB</span>
        </button>
        
        <div className="text-center text-[10px] text-gray-500 font-bold px-2 py-2">💡 Save to Club Hub, then share scorecard from history</div>

        <div className="flex space-x-3">
          <button onClick={handleShareText} className="flex-1 py-4 bg-emerald-50 text-emerald-700 font-black uppercase text-xs tracking-widest rounded-[2rem] border border-emerald-100 flex items-center justify-center space-x-2">
            <i className="fab fa-whatsapp"></i>
            <span>{copied ? 'Copied!' : 'Share Result'}</span>
          </button>
          <button onClick={handleCloudBackup} className="flex-1 py-4 bg-blue-50 text-blue-700 font-black uppercase text-xs tracking-widest rounded-[2rem] border border-blue-100 flex items-center justify-center space-x-2">
            <i className="fas fa-cloud"></i>
            <span>Cloud Offload</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowScorecard('summary')} className="py-4 bg-[#a1cf65] text-[#004e35] font-black uppercase text-xs tracking-widest rounded-[2rem] border border-[#99c955] flex items-center justify-center space-x-2 hover:bg-[#99c955] transition">
            <i className="fas fa-image"></i>
            <span>Summary Card</span>
          </button>
          <button onClick={() => setShowScorecard('full')} className="py-4 bg-yellow-400 text-[#004e35] font-black uppercase text-xs tracking-widest rounded-[2rem] border border-yellow-500 flex items-center justify-center space-x-2 hover:bg-yellow-500 transition">
            <i className="fas fa-receipt"></i>
            <span>Full Card</span>
          </button>
        </div>

        <button onClick={onBackToSetup} className="w-full py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest">Discard Match</button>
      </div>

      {showScorecard && (
        <div
          className="fixed inset-0 bg-black/70 z-[300] flex flex-col overflow-y-auto p-4"
          onClick={() => setShowScorecard(null)}
        >
          <div className="flex flex-col flex-1" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-black/70 py-2">
              <h2 className="text-white font-black text-lg">{showScorecard === 'summary' ? 'Summary Card' : 'Full Scorecard'}</h2>
              <button
                onClick={() => setShowScorecard(null)}
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
                  settings,
                  history,
                  finalScore: {
                    runs: teamAStats.score,
                    wickets: teamAStats.wickets,
                    overs: teamAStats.overs,
                    target: teamAStats.score + 1,
                    winner: matchWinner === 'Tie' ? undefined : matchWinner,
                    teamAScore: { runs: teamAStats.score, wickets: teamAStats.wickets, overs: teamAStats.overs },
                    teamBScore: inningsTwoHistory.length > 0 ? { runs: teamBStats.score, wickets: teamBStats.wickets, overs: teamBStats.overs } : undefined
                  }
                }}
                type={showScorecard}
                onDownload={() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                onShare={() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              />
            </div>
            <div className="flex gap-3 sticky bottom-0 bg-black/70 py-2">
              <button
                onClick={shareScorecardImage}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center space-x-2 hover:bg-blue-700 transition disabled:opacity-50"
              >
                <i className="fas fa-share-nodes"></i>
                <span>Share Image</span>
              </button>
              <button
                onClick={downloadScorecardImage}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center space-x-2 hover:bg-emerald-700 transition disabled:opacity-50"
              >
                <i className="fas fa-download"></i>
                <span>Download Image</span>
              </button>
              <button
                onClick={() => setShowScorecard(null)}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center space-x-2"
              >
                <i className="fas fa-times"></i>
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryScreen;
