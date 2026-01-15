
import React, { useMemo, useEffect, useState } from 'react';
import { MatchSettings, BallEvent, BattingStats, BowlingStats, WicketType, BallType, MatchRecord } from '../types';
import { GoogleGenAI } from '@google/genai';
import { ScorecardTable } from './ScorecardTable';

interface SummaryScreenProps {
  settings: MatchSettings;
  history: BallEvent[];
  onSave: (record: MatchRecord) => void;
  onBackToSetup: () => void;
}

const SummaryScreen: React.FC<SummaryScreenProps> = ({ settings, history, onSave, onBackToSetup }) => {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    let totalScore = 0;
    let totalWickets = 0;
    
    history.forEach(ball => {
      totalScore += ball.runs + (ball.type !== BallType.NORMAL ? 1 : 0);
      if (ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED) {
        totalWickets += 1;
      }
    });
    return { totalScore, totalWickets };
  }, [history]);

  const overCount = `${Math.floor(history.filter(b => b.type === BallType.NORMAL).length / 6)}.${history.filter(b => b.type === BallType.NORMAL).length % 6}`;

  useEffect(() => {
    const generateAISummary = async () => {
      if (history.length === 0) return;
      setIsLoadingSummary(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const matchData = {
          teamA: settings.teamA.name,
          teamB: settings.teamB.name,
          score: `${stats.totalScore}/${stats.totalWickets}`,
          overs: overCount,
        };
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Summarize this local cricket match as a sports journalist: ${JSON.stringify(matchData)}. Include the final score ${stats.totalScore}/${stats.totalWickets} in ${overCount} overs. Make it sound exciting for a WhatsApp group.`
        });
        setAiSummary(response.text || "Match finished!");
      } catch (e) {
        setAiSummary(`Excellent match! ${settings.teamA.name} finished at ${stats.totalScore}/${stats.totalWickets} in ${overCount} overs.`);
      } finally {
        setIsLoadingSummary(false);
      }
    };
    generateAISummary();
  }, [settings, stats, history]);

  const handleShareText = () => {
    const text = `🏏 *BATBALL MATCH RESULT*\n\n*${settings.teamA.name} vs ${settings.teamB.name}*\nScore: ${stats.totalScore}/${stats.totalWickets} (${overCount} overs)\n\n📝 *RECAP:*\n${aiSummary}\n\n_Scored with Batball_`;
    
    if (navigator.share) {
      navigator.share({ title: 'Match Result', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloudBackup = async () => {
    const record: MatchRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: Date.now(),
      settings,
      history,
      finalScore: { runs: stats.totalScore, wickets: stats.totalWickets, overs: overCount }
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

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
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
        <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Match Result</h2>
        <h3 className="text-3xl font-black text-gray-800 mb-1">{settings.teamA.name}</h3>
        <p className="text-5xl font-black text-emerald-700 mb-4">{stats.totalScore}/{stats.totalWickets} <span className="text-xl text-gray-400 font-normal">({overCount})</span></p>
      </div>

      <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 relative">
        <h4 className="font-black text-emerald-800 mb-2 flex items-center text-[10px] uppercase tracking-widest"><i className="fas fa-newspaper mr-2"></i> Match Recap</h4>
        {isLoadingSummary ? <div className="text-emerald-600 animate-pulse text-xs font-bold">Writing report...</div> : <p className="text-gray-700 italic leading-relaxed text-sm">{aiSummary}</p>}
        
        <button onClick={handleShareText} className="absolute top-4 right-4 bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition">
           <i className={`fas ${copied ? 'fa-check' : 'fa-share-nodes'}`}></i>
        </button>
      </div>

      <ScorecardTable 
        players={settings.teamA.players} 
        opponentPlayers={settings.teamB.players}
        history={history} 
        teamName={settings.teamA.name}
      />

      <div className="flex flex-col space-y-3">
        <button onClick={() => onSave({
          id: Math.random().toString(36).substr(2, 9),
          date: Date.now(),
          settings,
          history,
          finalScore: { runs: stats.totalScore, wickets: stats.totalWickets, overs: overCount }
        })} className="w-full py-5 bg-[#004e35] text-white font-black text-lg rounded-[2.5rem] shadow-xl hover:bg-emerald-700 transition flex items-center justify-center space-x-3">
          <i className="fas fa-floppy-disk text-[#a1cf65]"></i>
          <span>SAVE TO CLUB HUB</span>
        </button>
        
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
        <button onClick={onBackToSetup} className="w-full py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest">Discard Match</button>
      </div>
    </div>
  );
};

export default SummaryScreen;
