
import React, { useState, useEffect, useMemo } from 'react';
import { MatchSettings, MatchState, WicketType, BallType } from '../types';

interface BillboardViewProps {
  settings: MatchSettings;
  onExit: () => void;
}

const BillboardView: React.FC<BillboardViewProps> = ({ settings, onExit }) => {
  const [state, setState] = useState<MatchState | null>(null);
  const [flashEvent, setFlashEvent] = useState<{ msg: string; color: string } | null>(null);
  const [lastHistoryLength, setLastHistoryLength] = useState(0);

  const updateState = () => {
    const saved = localStorage.getItem('active_match_state');
    if (saved) {
      try { 
        const newState = JSON.parse(saved) as MatchState;
        setState(newState);
        
        if (newState.matchHistory.length > lastHistoryLength) {
          const lastBall = newState.matchHistory[newState.matchHistory.length - 1];
          if (lastBall.wicket !== WicketType.NONE) {
            if (lastBall.wicket === WicketType.RETIRED) {
              triggerFlash('RETIRED', 'bg-amber-500');
            } else {
              triggerFlash('OUT!', 'bg-red-600');
            }
          } else if (lastBall.runs === 4) {
            triggerFlash('FOUR!', 'bg-[#a1cf65]');
          } else if (lastBall.runs === 6) {
            triggerFlash('SIX!', 'bg-[#facc15]');
          }
          setLastHistoryLength(newState.matchHistory.length);
        }
      } catch(e) {}
    }
  };

  useEffect(() => {
    updateState();
    window.addEventListener('storage', updateState);
    const interval = setInterval(updateState, 2000);
    return () => {
      window.removeEventListener('storage', updateState);
      clearInterval(interval);
    };
  }, [lastHistoryLength]);

  const triggerFlash = (msg: string, color: string) => {
    setFlashEvent({ msg, color });
    setTimeout(() => setFlashEvent(null), 3500);
  };

  const striker = useMemo(() => state?.strikerId ? settings.teamA.players.find(p => p.id === state.strikerId) || settings.teamB.players.find(p => p.id === state.strikerId) : null, [state, settings]);
  const bowler = useMemo(() => state?.bowlerId ? settings.teamA.players.find(p => p.id === state.bowlerId) || settings.teamB.players.find(p => p.id === state.bowlerId) : null, [state, settings]);

  if (!state) return <div className="fixed inset-0 bg-[#001a11] text-white flex items-center justify-center font-black">WAITING FOR SCORER...</div>;

  const currentOvers = `${Math.floor(state.totalBalls / 6)}.${state.totalBalls % 6}`;
  const battingTeam = (state.currentInnings === 1) ? 
    ((settings.tossWinner === settings.teamA.id && settings.tossDecision === 'bat') || (settings.tossWinner === settings.teamB.id && settings.tossDecision === 'bowl') ? settings.teamA : settings.teamB) :
    ((settings.tossWinner === settings.teamA.id && settings.tossDecision === 'bat') || (settings.tossWinner === settings.teamB.id && settings.tossDecision === 'bowl') ? settings.teamB : settings.teamA);

  const target = state.firstInningsScore ? state.firstInningsScore + 1 : null;

  return (
    <div className="fixed inset-0 bg-[#001a11] text-white flex flex-col items-center justify-center p-8 overflow-hidden z-[200]">
      <div className="absolute top-8 left-8 flex space-x-4 opacity-10 hover:opacity-100 transition-opacity">
        <button onClick={onExit} className="bg-white/10 p-4 rounded-full"><i className="fas fa-times"></i></button>
      </div>

      <div className="text-center w-full max-w-7xl">
        <div className="flex items-center justify-center space-x-6 mb-8">
          <h2 className="text-6xl font-black uppercase tracking-[0.2em] text-[#a1cf65]">{battingTeam.name}</h2>
          {state.currentInnings === 2 && <span className="text-xl bg-amber-500 text-white px-4 py-1 rounded-full font-black animate-pulse uppercase">Chasing</span>}
        </div>
        
        <div className="flex items-baseline justify-center space-x-12">
          <h1 className="text-[32rem] font-black leading-none tracking-tighter shadow-emerald-900/50 drop-shadow-2xl">{state.score}</h1>
          <div className="flex flex-col items-start">
            <span className="text-[12rem] font-black text-[#a1cf65] leading-none">/{state.wickets}</span>
            <span className="text-6xl font-black text-white/40 tracking-widest mt-12">{currentOvers} <span className="text-2xl">OVERS</span></span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 mt-16">
          <div className="bg-white/5 p-12 rounded-[4rem] border border-white/10">
            <p className="text-2xl font-black uppercase text-[#a1cf65] mb-2">Batter</p>
            <p className="text-5xl font-black truncate">{striker?.name || '---'}</p>
          </div>
          <div className="bg-[#a1cf65] p-12 rounded-[4rem] flex flex-col items-center justify-center">
             {target ? (
               <>
                 <p className="text-2xl font-black uppercase text-[#004e35] mb-1">Need</p>
                 <p className="text-7xl font-black text-[#004e35]">{Math.max(0, target - state.score)}</p>
                 <p className="text-xl font-black text-[#004e35]/60 mt-2 uppercase">From {settings.totalOvers * 6 - state.totalBalls} Balls</p>
               </>
             ) : (
               <>
                 <p className="text-2xl font-black uppercase text-[#004e35] mb-1">Run Rate</p>
                 <p className="text-7xl font-black text-[#004e35]">{(state.score / (state.totalBalls/6 || 1)).toFixed(2)}</p>
               </>
             )}
          </div>
          <div className="bg-white/5 p-12 rounded-[4rem] border border-white/10">
            <p className="text-2xl font-black uppercase text-[#a1cf65] mb-2">Bowler</p>
            <p className="text-5xl font-black truncate">{bowler?.name || '---'}</p>
          </div>
        </div>
      </div>

      {flashEvent && (
        <div className="fixed inset-0 flex items-center justify-center z-[300] animate-fadeIn">
          <div className={`absolute inset-0 ${flashEvent.color}`}></div>
          <h3 className="relative z-10 text-[35rem] font-black italic tracking-tighter animate-bounce text-white drop-shadow-2xl">{flashEvent.msg}</h3>
        </div>
      )}
    </div>
  );
};

export default BillboardView;
