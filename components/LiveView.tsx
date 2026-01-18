
import React, { useState, useEffect, useMemo } from 'react';
import { MatchSettings, MatchState, BallType, WicketType } from '../types';
import { ScorecardTable } from './ScorecardTable';

interface LiveViewProps {
  settings: MatchSettings;
  isAuthorized?: boolean;
  onManage?: () => void;
}

const LiveView: React.FC<LiveViewProps> = ({ settings, isAuthorized, onManage }) => {
  const [state, setState] = useState<MatchState | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'scorecard'>('info');

  useEffect(() => {
    const update = () => {
      const saved = localStorage.getItem('active_match_state');
      if (saved) {
        try { setState(JSON.parse(saved)); } catch(e) {}
      }
    };
    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentBattingTeam = state?.currentInnings === 1 ? settings.teamA : settings.teamB;
  
  const striker = useMemo(() => state?.strikerId ? settings.teamA.players.find(p => p.id === state.strikerId) || settings.teamB.players.find(p => p.id === state.strikerId) : null, [state, settings]);
  const nonStriker = useMemo(() => state?.nonStrikerId ? settings.teamA.players.find(p => p.id === state.nonStrikerId) || settings.teamB.players.find(p => p.id === state.nonStrikerId) : null, [state, settings]);
  const bowler = useMemo(() => state?.bowlerId ? settings.teamA.players.find(p => p.id === state.bowlerId) || settings.teamB.players.find(p => p.id === state.bowlerId) : null, [state, settings]);

  if (!state) {
    return (
      <div className="text-center py-20 animate-fadeIn">
        <div className="w-16 h-16 border-4 border-[#004e35] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest">Broadcast Loading...</h3>
      </div>
    );
  }

  const currentOvers = `${Math.floor(state.totalBalls / 6)}.${state.totalBalls % 6}`;
  const currentOverBalls = useMemo(() => {
    // Calculate how many legal balls into the current over
    const ballsInCurrentOver = state.totalBalls % 6;
    if (ballsInCurrentOver === 0) return []; // No balls in current over yet

    const overBalls = [] as typeof state.matchHistory;
    let legal = 0;

    for (let i = state.matchHistory.length - 1; i >= 0; i--) {
      const ball = state.matchHistory[i];
      if (ball.innings !== state.currentInnings) continue;
      if (ball.wicket === WicketType.RETIRED) continue; // Do not visualize retire markers as balls

      overBalls.unshift(ball);
      if (ball.type === BallType.NORMAL) {
        legal += 1;
        if (legal === ballsInCurrentOver) break; // Stop after current over's legal balls
      }
    }
    return overBalls;
  }, [state.matchHistory, state.currentInnings, state.totalBalls]);

  const handleOpenBillboard = () => {
    window.location.hash = `#billboard-${settings.matchId}`;
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center space-x-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <button 
          onClick={handleOpenBillboard}
          className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-emerald-700 transition"
        >
          <i className="fas fa-tv mr-2"></i> Stadium Mode
        </button>
        {isAuthorized && onManage && (
          <button 
            onClick={onManage}
            className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-amber-600 transition"
          >
            <i className="fas fa-pencil mr-2"></i> Manage Scoring
          </button>
        )}
      </div>

      <div className="flex bg-gray-200/50 p-1 rounded-2xl">
        <button 
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'info' ? 'bg-[#004e35] shadow-sm text-white' : 'text-gray-500'}`}
        >
          Match Info
        </button>
        <button 
          onClick={() => setActiveTab('scorecard')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'scorecard' ? 'bg-[#004e35] shadow-sm text-white' : 'text-gray-500'}`}
        >
          Full Scorecard
        </button>
      </div>

      {activeTab === 'info' ? (
        <div className="space-y-4 animate-slideUp">
          <div className="bg-[#004e35] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <i className="fas fa-tower-broadcast text-9xl -mr-12 -mt-12"></i>
            </div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <span className="bg-[#a1cf65] text-[#004e35] text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full mb-3 inline-block animate-pulse">Live Broadcast</span>
                <div className="flex items-center space-x-2 mb-1">
                  {currentBattingTeam.logo && (
                    <img src={currentBattingTeam.logo} alt="" className="w-4 h-4 rounded-full object-cover" />
                  )}
                  <p className="text-[#a1cf65] text-[10px] font-black uppercase tracking-widest">{currentBattingTeam.name} Innings</p>
                </div>
                <h2 className="text-7xl font-black tracking-tighter">{state.score}<span className="text-white/20 font-light mx-2">/</span>{state.wickets}</h2>
              </div>
              <div className="text-right pt-4">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Overs</p>
                <p className="text-4xl font-black tracking-tighter">{currentOvers}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="border-l-2 border-[#a1cf65] pl-4 py-1">
                <p className="text-[#a1cf65] text-[9px] font-black uppercase tracking-widest mb-1">Batting</p>
                <p className="font-bold text-sm truncate">{striker?.name}*</p>
                <p className="font-bold text-sm text-white/40 truncate">{nonStriker?.name}</p>
              </div>
              <div className="border-l-2 border-white/10 pl-4 py-1">
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">Bowling</p>
                <p className="font-bold text-sm truncate">{bowler?.name}</p>
                <p className="text-[10px] font-black text-[#a1cf65] uppercase mt-1">CRR: {(state.score / (state.totalBalls/6 || 1)).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Recent Balls</h4>
            <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-2">
              {[...currentOverBalls].reverse().map(ball => {
                const isWicket = ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED;
                const isRetired = ball.wicket === WicketType.RETIRED;
                return (
                  <div key={ball.id} className="flex flex-col items-center shrink-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black mb-1 border-b-2 ${isWicket ? 'bg-red-600 text-white border-red-800' : isRetired ? 'bg-amber-500 text-white border-amber-700' : ball.runs === 4 ? 'bg-[#a1cf65] text-[#004e35] border-[#88b34f]' : ball.runs === 6 ? 'bg-[#facc15] text-[#004e35] border-yellow-700' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {isWicket ? 'W' : isRetired ? 'R' : ball.runs}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-slideUp space-y-6">
          <ScorecardTable 
            players={settings.teamA.players} 
            opponentPlayers={settings.teamB.players}
            history={state.matchHistory.filter(b => b.innings === 1)}
            teamName={settings.teamA.name}
          />

          {state.matchHistory.some(b => b.innings === 2) && (
            <ScorecardTable 
              players={settings.teamB.players} 
              opponentPlayers={settings.teamA.players}
              history={state.matchHistory.filter(b => b.innings === 2)}
              teamName={settings.teamB.name}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default LiveView;
