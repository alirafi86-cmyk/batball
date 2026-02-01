
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MatchSettings, MatchState, BallEvent, BallType, WicketType } from '../types';
import EditMatchSettingsModal from './EditMatchSettingsModal';
import ManageSquadModal from './ManageSquadModal';

interface ScoringScreenProps {
  settings: MatchSettings;
  onFinish: (history: BallEvent[]) => void;
  onUpdateSettings?: (settings: MatchSettings) => void;
}

const ScoringScreen: React.FC<ScoringScreenProps> = ({ settings, onFinish, onUpdateSettings }) => {
  const [activeExtra, setActiveExtra] = useState<BallType>(BallType.NORMAL);
  const [isSaved, setIsSaved] = useState(false);
  const [showEditSettings, setShowEditSettings] = useState(false);
  const [showManageSquad, setShowManageSquad] = useState(false);
  const [currentSettings, setCurrentSettings] = useState(settings);
  
  const [state, setState] = useState<MatchState>(() => {
    const recovered = localStorage.getItem('active_match_state');
    if (recovered) {
      try { return JSON.parse(recovered); } catch(e) {}
    }

    return {
      currentInnings: 1,
      score: 0,
      wickets: 0,
      ballsInOver: 0,
      totalBalls: 0,
      strikerId: '',
      nonStrikerId: '',
      bowlerId: '',
      matchHistory: [],
      isMatchOver: false,
      retiredPlayerIds: []
    };
  });

  useEffect(() => {
    // Persist match data locally on every state change
    localStorage.setItem('active_match_state', JSON.stringify(state));
    localStorage.setItem('active_match_settings', JSON.stringify(currentSettings));

    const registry = JSON.parse(localStorage.getItem('match_registry') || '[]');
    const currentOvers = `${Math.floor(state.totalBalls / 6)}.${state.totalBalls % 6}`;
    
    const updatedRegistry = [
      ...registry.filter((m: any) => m.matchId !== currentSettings.matchId),
      {
        matchId: currentSettings.matchId,
        settings: currentSettings,
        score: state.score,
        wickets: state.wickets,
        overs: currentOvers,
        innings: state.currentInnings,
        target: state.firstInningsScore ? state.firstInningsScore + 1 : undefined,
        lastUpdated: Date.now()
      }
    ];
    localStorage.setItem('match_registry', JSON.stringify(updatedRegistry));

    // Flash the "Saved" indicator
    setIsSaved(true);
    const timer = setTimeout(() => setIsSaved(false), 1500);
    return () => clearTimeout(timer);
  }, [state, currentSettings]);

  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [showBatterSelect, setShowBatterSelect] = useState<{ active: boolean, target: 'striker' | 'nonStriker' | 'runout' | 'runoutNew' | 'runoutEnd', forceSelection?: boolean, runoutOutId?: string, runoutNewId?: string }>({ active: false, target: 'striker' });

  // Prompt for openers and opening bowler if not chosen yet (new match or new innings)
  useEffect(() => {
    // On first innings, skip if we have history (recovered match); on second+ innings, still prompt if players not selected
    if (state.matchHistory.length > 0 && state.currentInnings === 1) return;
    
    if (!state.strikerId || !state.nonStrikerId) {
      setShowBatterSelect({ active: true, target: state.strikerId ? 'nonStriker' : 'striker', forceSelection: true });
    }
    if (!state.bowlerId) {
      setShowBowlerSelect(true);
    }
  }, [state.matchHistory.length, state.strikerId, state.nonStrikerId, state.bowlerId, state.currentInnings]);

  const currentBattingTeam = (state.currentInnings === 1) ? 
    ((currentSettings.tossWinner === currentSettings.teamA.id && currentSettings.tossDecision === 'bat') || (currentSettings.tossWinner === currentSettings.teamB.id && currentSettings.tossDecision === 'bowl') ? currentSettings.teamA : currentSettings.teamB) :
    ((currentSettings.tossWinner === currentSettings.teamA.id && currentSettings.tossDecision === 'bat') || (currentSettings.tossWinner === currentSettings.teamB.id && currentSettings.tossDecision === 'bowl') ? currentSettings.teamB : currentSettings.teamA);

  const currentBowlingTeam = currentBattingTeam.id === currentSettings.teamA.id ? currentSettings.teamB : currentSettings.teamA;

  const striker = currentBattingTeam.players.find(p => p.id === state.strikerId);
  const nonStriker = currentBattingTeam.players.find(p => p.id === state.nonStrikerId);
  const currentBowler = currentBowlingTeam.players.find(p => p.id === state.bowlerId);

  const getPlayerStats = (playerId: string) => {
    if (!playerId) return { runs: 0, balls: 0 };
    const playerHistory = state.matchHistory.filter(b => b.innings === state.currentInnings && b.strikerId === playerId);
    return {
      runs: playerHistory.reduce((acc, b) => acc + b.runs, 0),
      balls: playerHistory.filter(b => b.type === BallType.NORMAL).length
    };
  };

  const strikerStats = useMemo(() => getPlayerStats(state.strikerId), [state.matchHistory, state.strikerId, state.currentInnings]);
  const nonStrikerStats = useMemo(() => getPlayerStats(state.nonStrikerId), [state.matchHistory, state.nonStrikerId, state.currentInnings]);

  const currentOverBalls = useMemo(() => {
    const currentOver = Math.floor(state.totalBalls / 6);
    
    // Get all balls from current innings that belong to the current over
    return state.matchHistory.filter(ball => 
      ball.innings === state.currentInnings && 
      ball.over === currentOver &&
      ball.wicket !== WicketType.RETIRED
    );
  }, [state.matchHistory, state.currentInnings, state.totalBalls]);

  const target = state.firstInningsScore !== undefined ? state.firstInningsScore + 1 : null;
  const isChaseDone = target !== null && state.score >= target;
  const isInningsOver = state.totalBalls >= currentSettings.totalOvers * 6 || state.wickets >= currentSettings.playersPerTeam - 1 || isChaseDone;
  const isOversComplete = state.totalBalls >= currentSettings.totalOvers * 6;

  const addBall = useCallback((runs: number, type: BallType, wicket: WicketType = WicketType.NONE, retiringPlayerId?: string) => {
    if (state.isMatchOver) return;
    if (isOversComplete && type === BallType.NORMAL) return; // Prevent adding normal balls after overs are complete

    // Require explicit opener selection and bowler selection before logging a ball
    if (!state.strikerId || !state.nonStrikerId) {
      setShowBatterSelect({ active: true, target: state.strikerId ? 'nonStriker' : 'striker', forceSelection: true });
      return;
    }
    if (!state.bowlerId) {
      setShowBowlerSelect(true);
      return;
    }

    setState(prev => {
      const actualStrikerId = retiringPlayerId || prev.strikerId;
      const currentOver = Math.floor(prev.totalBalls / 6);
      
      const ball: BallEvent = {
        id: Math.random().toString(36).substr(2, 9),
        runs,
        type,
        wicket,
        strikerId: actualStrikerId, 
        bowlerId: prev.bowlerId,
        innings: prev.currentInnings,
        timestamp: Date.now(),
        over: currentOver
      };

      let nextScore = prev.score + runs;
      if (type === BallType.WIDE || type === BallType.NO_BALL) nextScore += 1;
      
      let nextWickets = prev.wickets + (wicket !== WicketType.NONE && wicket !== WicketType.RETIRED ? 1 : 0);
      let nextBallsInOver = prev.ballsInOver;
      let nextTotalBalls = prev.totalBalls;

      if (type === BallType.NORMAL && wicket !== WicketType.RETIRED) {
        nextBallsInOver += 1;
        nextTotalBalls += 1;
      }

      let nextStrikerId = prev.strikerId;
      let nextNonStrikerId = prev.nonStrikerId;
      let nextRetiredIds = [...prev.retiredPlayerIds];

      const runsThatRotate = (runs % 2 !== 0);
      if (runsThatRotate && wicket === WicketType.NONE) {
        [nextStrikerId, nextNonStrikerId] = [nextNonStrikerId, nextStrikerId];
      }

      let overFinished = false;
      if (nextBallsInOver === 6 && wicket === WicketType.NONE) {
        overFinished = true;
        nextBallsInOver = 0;
        [nextStrikerId, nextNonStrikerId] = [nextNonStrikerId, nextStrikerId];
      }

      if (wicket !== WicketType.NONE) {
        if (wicket === WicketType.RETIRED) {
          nextRetiredIds.push(actualStrikerId);
          if (actualStrikerId === prev.strikerId) nextStrikerId = '';
          else if (actualStrikerId === prev.nonStrikerId) nextNonStrikerId = '';
        } else if (wicket === WicketType.RUN_OUT) {
          // Multi-step runout flow
          setTimeout(() => {
            setShowBatterSelect({ active: true, target: 'runout', forceSelection: true });
          }, 0);
        } else {
          nextStrikerId = '';
        }
      }

      const newState = {
        ...prev,
        score: nextScore,
        wickets: nextWickets,
        ballsInOver: nextBallsInOver,
        totalBalls: nextTotalBalls,
        strikerId: nextStrikerId,
        nonStrikerId: nextNonStrikerId,
        matchHistory: [...prev.matchHistory, ball],
        retiredPlayerIds: nextRetiredIds
      };

      const isGameOver = prev.currentInnings === 2 && (nextScore >= (prev.firstInningsScore! + 1) || nextTotalBalls >= currentSettings.totalOvers * 6 || nextWickets >= currentSettings.playersPerTeam - 1);
      if (isGameOver) newState.isMatchOver = true;

      if (!isGameOver) {
        if (overFinished && nextTotalBalls < currentSettings.totalOvers * 6) setShowBowlerSelect(true);
        
        // Check if there are available batsmen before prompting
        const availableBatsmen = currentBattingTeam.players.filter(p => 
          p.id !== newState.strikerId && 
          p.id !== newState.nonStrikerId && 
          !newState.retiredPlayerIds.includes(p.id) && 
          !newState.matchHistory.some(b => b.innings === newState.currentInnings && b.strikerId === p.id && b.wicket !== WicketType.NONE && b.wicket !== WicketType.RETIRED)
        );
        
        if (nextStrikerId === '' && nextWickets < currentSettings.playersPerTeam - 1 && availableBatsmen.length > 0) {
          setShowBatterSelect({ active: true, target: 'striker', forceSelection: true });
        } else if (nextNonStrikerId === '' && nextWickets < currentSettings.playersPerTeam - 1 && availableBatsmen.length > 0) {
          setShowBatterSelect({ active: true, target: 'nonStriker', forceSelection: true });
        }
      }

      return newState;
    });

    setActiveExtra(BallType.NORMAL);
  }, [currentSettings.totalOvers, currentSettings.playersPerTeam, state.isMatchOver, state.strikerId, state.nonStrikerId, state.bowlerId]);

  const handleUpdateSettings = (updatedSettings: MatchSettings) => {
    setCurrentSettings(updatedSettings);
    if (onUpdateSettings) {
      onUpdateSettings(updatedSettings);
    }
    setShowEditSettings(false);
  };

  const handleUpdateSquad = (updatedSettings: MatchSettings) => {
    setCurrentSettings(updatedSettings);
    if (onUpdateSettings) {
      onUpdateSettings(updatedSettings);
    }
    setShowManageSquad(false);
  };

  const handleTransitionInnings = () => {
    const nextBattingTeam = currentBowlingTeam;
    const nextBowlingTeam = currentBattingTeam;

    setState(prev => ({
      ...prev,
      currentInnings: 2,
      firstInningsScore: prev.score,
      firstInningsWickets: prev.wickets,
      firstInningsOvers: `${Math.floor(prev.totalBalls / 6)}.${prev.totalBalls % 6}`,
      score: 0,
      wickets: 0,
      ballsInOver: 0,
      totalBalls: 0,
      strikerId: '',
      nonStrikerId: '',
      bowlerId: '',
      retiredPlayerIds: []
    }));

    setShowBatterSelect({ active: true, target: 'striker', forceSelection: true });
    setShowBowlerSelect(true);
  };

  const undoLast = () => {
    setState(prev => {
      if (prev.matchHistory.length === 0) return prev;
      const history = [...prev.matchHistory];
      const last = history.pop()!;
      
      let revScore = prev.score - last.runs;
      if (last.type !== BallType.NORMAL) revScore -= 1;
      const revWickets = prev.wickets - (last.wicket !== WicketType.NONE && last.wicket !== WicketType.RETIRED ? 1 : 0);
      let revBallsInOver = prev.ballsInOver;
      let revTotalBalls = prev.totalBalls;
      if (last.type === BallType.NORMAL && last.wicket !== WicketType.RETIRED) {
        revBallsInOver = prev.ballsInOver === 0 ? 5 : prev.ballsInOver - 1;
        revTotalBalls -= 1;
      }

      let nextRetiredIds = prev.retiredPlayerIds;
      if (last.wicket === WicketType.RETIRED) {
        nextRetiredIds = nextRetiredIds.filter(id => id !== last.strikerId);
      }

      return { 
        ...prev, 
        score: revScore, 
        wickets: revWickets, 
        ballsInOver: revBallsInOver, 
        totalBalls: revTotalBalls, 
        matchHistory: history, 
        isMatchOver: false,
        retiredPlayerIds: nextRetiredIds,
        strikerId: last.strikerId === prev.strikerId || !prev.strikerId ? last.strikerId : prev.strikerId,
        nonStrikerId: last.strikerId === prev.nonStrikerId || !prev.nonStrikerId ? last.strikerId : prev.nonStrikerId
      };
    });
  };

  const currentOvers = `${Math.floor(state.totalBalls / 6)}.${state.totalBalls % 6}`;

  return (
    <div className="space-y-4 animate-fadeIn pb-24">
      <div className="flex justify-between items-center bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 gap-2 flex-wrap">
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border transition-all duration-500 ${isSaved ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
            <i className={`fas fa-cloud-arrow-up text-[10px] ${isSaved ? 'animate-bounce' : ''}`}></i>
            <span className="text-[8px] font-black uppercase tracking-widest">{isSaved ? 'Saved Locally' : 'Ready Offline'}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowEditSettings(true)}
            className="text-[9px] font-bold uppercase tracking-widest bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-xl border border-blue-200 transition flex items-center space-x-1"
          >
            <i className="fas fa-sliders-h text-xs"></i>
            <span>Overs</span>
          </button>
          <button 
            onClick={() => setShowManageSquad(true)}
            className="text-[9px] font-bold uppercase tracking-widest bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded-xl border border-purple-200 transition flex items-center space-x-1"
          >
            <i className="fas fa-users text-xs"></i>
            <span>Squad</span>
          </button>
          <button className="text-[10px] font-black uppercase tracking-widest bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
            <i className="fas fa-share-nodes mr-1"></i> Share
          </button>
        </div>
      </div>

      <div className={`text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden transition-colors duration-500 ${state.currentInnings === 1 ? 'bg-[#004e35]' : 'bg-emerald-800'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-10"><i className="fas fa-baseball-bat-ball text-9xl -mr-12 -mt-12"></i></div>
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <p className="text-emerald-200 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              {currentBattingTeam.name} {state.currentInnings === 2 ? `(Target: ${target}, Chasing)` : ''}
            </p>
            <h2 className="text-6xl font-black flex items-baseline">{state.score}<span className="text-[#a1cf65] font-light mx-2 text-4xl">/</span>{state.wickets}</h2>
          </div>
          <div className="text-right">
            <p className="text-emerald-200 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Overs</p>
            <p className="text-3xl font-black tracking-tighter">{currentOvers}<span className="text-xs opacity-50 ml-1">/{currentSettings.totalOvers}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 relative z-10 mb-4">
          <div 
            onClick={() => !state.strikerId && setShowBatterSelect({ active: true, target: 'striker' })}
            className={`p-4 rounded-3xl border flex flex-col justify-between transition-all cursor-pointer ${strikerStats.balls >= currentSettings.retirementLimit ? 'bg-amber-500/90 border-amber-300' : 'bg-black/20 border-white/10'}`}
          >
            <div>
              <span className={`text-[8px] uppercase font-black tracking-widest block mb-1 ${strikerStats.balls >= currentSettings.retirementLimit ? 'text-[#004e35]' : 'text-[#a1cf65]'}`}>Striker</span>
              <span className={`font-black text-lg truncate block leading-none ${strikerStats.balls >= currentSettings.retirementLimit ? 'text-[#004e35]' : 'text-white'}`}>{striker?.name || '---'}</span>
            </div>
            <div className="flex justify-between items-end mt-4">
               <span className={`text-xl font-black ${strikerStats.balls >= currentSettings.retirementLimit ? 'text-[#004e35]' : 'text-white'}`}>{strikerStats.runs} <span className="text-[10px] opacity-50">({strikerStats.balls})</span></span>
               {state.strikerId && (
                 <button 
                  onClick={(e) => { e.stopPropagation(); addBall(0, BallType.NORMAL, WicketType.RETIRED, state.strikerId); }}
                  className={`text-[9px] font-black uppercase px-2 py-1.5 rounded-lg border shadow-sm ${strikerStats.balls >= currentSettings.retirementLimit ? 'bg-[#004e35] text-white border-transparent' : 'bg-white/10 text-white border-white/20'}`}
                 >
                   Retire
                 </button>
               )}
            </div>
          </div>

          <div 
            onClick={() => !state.nonStrikerId && setShowBatterSelect({ active: true, target: 'nonStriker' })}
            className={`p-4 rounded-3xl border flex flex-col justify-between transition-all cursor-pointer ${nonStrikerStats.balls >= currentSettings.retirementLimit ? 'bg-amber-500/90 border-amber-300' : 'bg-black/10 border-white/5 opacity-70'}`}
          >
            <div>
              <span className={`text-[8px] uppercase font-black tracking-widest block mb-1 ${nonStrikerStats.balls >= currentSettings.retirementLimit ? 'text-[#004e35]' : 'text-white/40'}`}>Non-Striker</span>
              <span className={`font-black text-lg truncate block leading-none ${nonStrikerStats.balls >= currentSettings.retirementLimit ? 'text-[#004e35]' : 'text-white'}`}>{nonStriker?.name || '---'}</span>
            </div>
            <div className="flex justify-between items-end mt-4">
               <span className={`text-xl font-black ${nonStrikerStats.balls >= currentSettings.retirementLimit ? 'text-[#004e35]' : 'text-white'}`}>{nonStrikerStats.runs} <span className="text-[10px] opacity-50">({nonStrikerStats.balls})</span></span>
               {state.nonStrikerId && (
                 <button 
                  onClick={(e) => { e.stopPropagation(); addBall(0, BallType.NORMAL, WicketType.RETIRED, state.nonStrikerId); }}
                  className={`text-[9px] font-black uppercase px-2 py-1.5 rounded-lg border shadow-sm ${nonStrikerStats.balls >= currentSettings.retirementLimit ? 'bg-[#004e35] text-white border-transparent' : 'bg-white/10 text-white border-white/20'}`}
                 >
                   Retire
                 </button>
               )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-black/20 p-2 rounded-xl">
          <span className="text-[9px] font-black uppercase text-[#a1cf65] tracking-tighter shrink-0">Over:</span>
          <div className="flex space-x-1 overflow-x-auto no-scrollbar py-1">
            {currentOverBalls.map(ball => {
              const isWicket = ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED;
              const isRetired = ball.wicket === WicketType.RETIRED;
              let display = '';
              let badgeClass = '';
              if (ball.type === BallType.NO_BALL) {
                badgeClass = 'bg-purple-600 text-white';
                display = ball.runs === 0 ? 'NB' : `NB+${ball.runs}`;
              } else if (ball.type === BallType.WIDE) {
                badgeClass = 'bg-blue-600 text-white';
                display = ball.runs === 0 ? 'WD' : `WD+${ball.runs}`;
              } else {
                display = String(ball.runs);
              }
              return (
                <div
                  key={ball.id}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 border border-white/10 ${
                    isWicket ? 'bg-red-600' : isRetired ? 'bg-amber-500' : badgeClass || 'bg-white/10'
                  }`}
                  title={ball.type === BallType.NO_BALL ? 'No Ball' : ball.type === BallType.WIDE ? 'Wide' : ''}
                >
                  {isWicket ? 'W' : isRetired ? 'R' : display}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!state.isMatchOver && !isInningsOver ? (
        <>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-200 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-[#004e35] text-sm"><i className="fas fa-baseball"></i></div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-0.5">Bowler</p>
                <p className="font-black text-gray-800">{currentBowler?.name || 'Select bowler'}</p>
              </div>
            </div>
            <button onClick={() => setShowBowlerSelect(true)} className="text-[10px] bg-emerald-50 text-[#004e35] px-4 py-2 rounded-xl font-black uppercase tracking-wider border border-emerald-100">Change</button>
          </div>

          <div className="flex justify-center space-x-4 mb-2">
            {activeExtra !== BallType.NORMAL && (
              <span className="text-[10px] font-black text-[#004e35] bg-[#a1cf65] px-3 py-1 rounded-full animate-pulse uppercase tracking-widest">
                ARMED: {activeExtra}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map(runs => (
              <button key={runs} onClick={() => addBall(runs, activeExtra)} className="aspect-square rounded-2xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center transition active:scale-90 font-black text-2xl text-gray-800">{runs}</button>
            ))}
            <button onClick={() => addBall(4, activeExtra)} className="h-20 rounded-2xl bg-[#a1cf65] text-[#004e35] shadow-md flex items-center justify-center col-span-2 transition active:scale-95 border-b-4 border-[#88b34f] font-black text-3xl">4</button>
            <button onClick={() => addBall(6, activeExtra)} className="h-20 rounded-2xl bg-[#facc15] text-[#004e35] shadow-md flex items-center justify-center col-span-2 transition active:scale-95 border-b-4 border-yellow-700 font-black text-3xl">6</button>
            
            <button 
              onClick={() => setActiveExtra(prev => prev === BallType.WIDE ? BallType.NORMAL : BallType.WIDE)} 
              className={`h-16 rounded-2xl border-2 font-black text-xs col-span-2 uppercase transition-colors ${activeExtra === BallType.WIDE ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-emerald-50 border-emerald-100 text-[#004e35]'}`}
            >
              Wide (+1)
            </button>
            <button 
              onClick={() => setActiveExtra(prev => prev === BallType.NO_BALL ? BallType.NORMAL : BallType.NO_BALL)} 
              className={`h-16 rounded-2xl border-2 font-black text-xs col-span-2 uppercase transition-colors ${activeExtra === BallType.NO_BALL ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-emerald-50 border-emerald-100 text-[#004e35]'}`}
            >
              No Ball (+1)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setShowWicketModal(true)} className="h-24 rounded-[2rem] bg-red-600 text-white shadow-lg flex flex-col items-center justify-center border-b-4 border-red-800 transition active:scale-95"><i className="fas fa-skull-crossbones text-xl mb-1"></i><span className="text-xs font-black uppercase">Wicket</span></button>
            <button onClick={undoLast} className="h-24 rounded-[2rem] bg-gray-800 text-white shadow-lg flex flex-col items-center justify-center border-b-4 border-black transition active:scale-95"><i className="fas fa-undo text-xl mb-1"></i><span className="text-xs font-black uppercase">Undo Ball</span></button>
          </div>
        </>
      ) : (
        <div className="bg-amber-100 border-2 border-amber-200 p-8 rounded-[2.5rem] text-center animate-bounce">
          <h3 className="text-2xl font-black text-amber-900 uppercase italic">
            {state.currentInnings === 1 ? 'First Innings Complete!' : 'Innings Over!'}
          </h3>
          <p className="text-sm font-bold text-amber-800/60 mt-2">
            {state.currentInnings === 1 ? 'Score: ' + state.score + '/' + state.wickets : state.isMatchOver ? 'Match finished.' : 'Continue below.'}
          </p>
        </div>
      )}

      {showWicketModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-[#001a11]/90 backdrop-blur-xl p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 shadow-2xl animate-scaleIn relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
             <h3 className="text-3xl font-black mb-8 text-center text-gray-900 uppercase italic tracking-tighter">How Out?</h3>
             <div className="grid grid-cols-2 gap-3">
                {[WicketType.BOWLED, WicketType.CAUGHT, WicketType.LBW, WicketType.RUN_OUT, WicketType.STUMPED, WicketType.RETIRED].map(t => (
                  <button 
                    key={t} 
                    onClick={() => { addBall(0, BallType.NORMAL, t); setShowWicketModal(false); }} 
                    className={`py-5 rounded-2xl font-black text-xs uppercase transition shadow-md active:scale-95 border-b-4 ${t === WicketType.RETIRED ? 'bg-amber-500 text-white border-amber-700' : 'bg-[#004e35] text-white border-[#003020]'}`}
                  >
                    {t}
                  </button>
                ))}
             </div>
             <button onClick={() => setShowWicketModal(false)} className="w-full mt-8 py-3 bg-gray-100 text-gray-400 font-black uppercase text-[10px] rounded-xl tracking-widest hover:text-gray-600 transition">Cancel</button>
          </div>
        </div>
      )}

      {showBatterSelect.active && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-[#001a11]/90 backdrop-blur-xl p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
            
            {/* Step 1: Who was run out? */}
            {showBatterSelect.target === 'runout' && (
              <>
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-6">Who was run out?</h3>
                <div className="overflow-y-auto space-y-2 flex-1 pr-2 custom-scrollbar">
                  {[state.strikerId, state.nonStrikerId].map(pid => {
                    const p = currentBattingTeam.players.find(x => x.id === pid);
                    if (!p) return null;
                    const stats = getPlayerStats(p.id);
                    return (
                      <button key={p.id} onClick={() => setShowBatterSelect({ active: true, target: 'runoutNew', forceSelection: true, runoutOutId: p.id })} className="w-full p-5 rounded-2xl text-left font-black border-2 transition active:scale-95 flex justify-between items-center border-red-400 bg-red-50 text-red-800">
                        <div>
                          <p>{p.name}</p>
                          {stats.balls > 0 && <p className="text-[10px] opacity-60 font-bold">{stats.runs} runs off {stats.balls} balls</p>}
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest bg-red-200 text-red-800 px-2 py-1 rounded">OUT</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            
            {/* Step 2: Select new batsman */}
            {showBatterSelect.target === 'runoutNew' && (
              <>
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-6">Select New Batsman</h3>
                <div className="overflow-y-auto space-y-2 flex-1 pr-2 custom-scrollbar">
                  {currentBattingTeam.players.filter(p => 
                    p.id !== state.strikerId && 
                    p.id !== state.nonStrikerId && 
                    !state.retiredPlayerIds.includes(p.id) && 
                    !state.matchHistory.some(b => b.innings === state.currentInnings && b.strikerId === p.id && b.wicket !== WicketType.NONE && b.wicket !== WicketType.RETIRED)
                  ).map(p => {
                    const stats = getPlayerStats(p.id);
                    return (
                      <button key={p.id} onClick={() => setShowBatterSelect({ active: true, target: 'runoutEnd', forceSelection: true, runoutOutId: showBatterSelect.runoutOutId, runoutNewId: p.id })} className="w-full p-5 rounded-2xl text-left font-black border-2 transition active:scale-95 flex justify-between items-center border-emerald-400 bg-emerald-50 text-emerald-800">
                        <div>
                          <p>{p.name}</p>
                          {stats.balls > 0 && <p className="text-[10px] opacity-60 font-bold">{stats.runs} runs off {stats.balls} balls</p>}
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-200 text-emerald-800 px-2 py-1 rounded">IN</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            
            {/* Step 3: Assign end */}
            {showBatterSelect.target === 'runoutEnd' && (
              <>
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-6">Which End?</h3>
                <div className="space-y-3 flex-1">
                  <button onClick={() => {
                    setState(s => {
                      let newStriker = s.strikerId;
                      let newNonStriker = s.nonStrikerId;
                      // If out batsman was striker, new batsman takes striker end
                      if (showBatterSelect.runoutOutId === s.strikerId) {
                        newStriker = showBatterSelect.runoutNewId!;
                      } 
                      // If out batsman was non-striker, non-striker becomes striker, new batsman takes non-striker
                      else if (showBatterSelect.runoutOutId === s.nonStrikerId) {
                        newStriker = s.strikerId;
                        newNonStriker = showBatterSelect.runoutNewId!;
                      }
                      return { ...s, strikerId: newStriker, nonStrikerId: newNonStriker };
                    });
                    setShowBatterSelect({ active: false, target: 'striker' });
                  }} className="w-full py-5 bg-emerald-600 text-white font-black text-lg rounded-2xl transition active:scale-95">Striker End</button>
                  <button onClick={() => {
                    setState(s => {
                      let newStriker = s.strikerId;
                      let newNonStriker = s.nonStrikerId;
                      // If out batsman was striker, striker becomes non-striker, new batsman takes striker
                      if (showBatterSelect.runoutOutId === s.strikerId) {
                        newNonStriker = s.nonStrikerId;
                        newStriker = showBatterSelect.runoutNewId!;
                      } 
                      // If out batsman was non-striker, new batsman takes non-striker end
                      else if (showBatterSelect.runoutOutId === s.nonStrikerId) {
                        newNonStriker = showBatterSelect.runoutNewId!;
                      }
                      return { ...s, strikerId: newStriker, nonStrikerId: newNonStriker };
                    });
                    setShowBatterSelect({ active: false, target: 'striker' });
                  }} className="w-full py-5 bg-blue-600 text-white font-black text-lg rounded-2xl transition active:scale-95">Non-Striker End</button>
                </div>
              </>
            )}
            
            {/* Default: opener/non-striker selection */}
            {(showBatterSelect.target === 'striker' || showBatterSelect.target === 'nonStriker') && (
              <>
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-6">
                  Select {showBatterSelect.target === 'striker' ? 'Striker' : 'Non-Striker'}
                </h3>
                <div className="overflow-y-auto space-y-2 flex-1 pr-2 custom-scrollbar">
                  {currentBattingTeam.players.map(p => {
                    const isAtCrease = p.id === state.strikerId || p.id === state.nonStrikerId;
                    const isRetired = state.retiredPlayerIds.includes(p.id);
                    const isOut = state.matchHistory.some(b => b.innings === state.currentInnings && b.strikerId === p.id && b.wicket !== WicketType.NONE && b.wicket !== WicketType.RETIRED);
                    
                    if (isAtCrease || isOut) return null;

                    const stats = getPlayerStats(p.id);

                return (
                  <button 
                    key={p.id} 
                    onClick={() => { 
                      setState(s => ({ 
                        ...s, 
                        [showBatterSelect.target === 'striker' ? 'strikerId' : 'nonStrikerId']: p.id,
                        retiredPlayerIds: s.retiredPlayerIds.filter(id => id !== p.id)
                      })); 
                      setShowBatterSelect({ active: false, target: 'striker' }); 
                    }} 
                    className={`w-full p-5 rounded-2xl text-left font-black border-2 transition active:scale-95 flex justify-between items-center ${isRetired ? 'border-amber-400 bg-amber-50 text-[#92400e]' : 'border-gray-100 bg-gray-50 text-[#004e35]'}`}
                  >
                    <div>
                      <p>{p.name}</p>
                      {stats.balls > 0 && <p className="text-[10px] opacity-60 font-bold">{stats.runs} runs off {stats.balls} balls</p>}
                    </div>
                    {isRetired && (
                      <span className="text-[8px] font-black uppercase tracking-widest bg-amber-200 text-amber-800 px-2 py-1 rounded">Resume Innings</span>
                    )}
                  </button>
                );
              })}
            </div>
              </>
            )}
            <button 
              onClick={() => !showBatterSelect.forceSelection && setShowBatterSelect({ active: false, target: 'striker' })} 
              disabled={!!showBatterSelect.forceSelection}
              className="w-full mt-4 py-4 bg-gray-100 text-gray-500 font-black uppercase text-xs rounded-2xl tracking-widest hover:bg-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {showBatterSelect.forceSelection ? (
                showBatterSelect.target === 'runout' ? 'Select batter to continue'
                : showBatterSelect.target === 'runoutNew' ? 'Select new batsman to continue'
                : showBatterSelect.target === 'runoutEnd' ? 'Assign end to continue'
                : 'Pick openers to continue'
              ) : 'Skip / Not Now'}
            </button>
          </div>
        </div>
      )}

      {showBowlerSelect && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-[#001a11]/90 backdrop-blur-xl p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
            <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-6">Select New Bowler</h3>
            <div className="overflow-y-auto space-y-2 flex-1 pr-2 custom-scrollbar">
              {currentBowlingTeam.players.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => { setState(s => ({ ...s, bowlerId: p.id })); setShowBowlerSelect(false); }} 
                  className={`w-full p-5 rounded-2xl text-left font-black border-2 transition active:scale-95 ${state.bowlerId === p.id ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-100 bg-gray-50 text-gray-800'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="pt-6">
        {state.currentInnings === 1 && isInningsOver ? (
          <button onClick={handleTransitionInnings} className="w-full py-5 bg-emerald-600 text-white font-black text-lg rounded-[2.5rem] shadow-xl flex items-center justify-center space-x-3 border-b-4 border-emerald-800 transition">
            <span>START 2ND INNINGS</span><i className="fas fa-chevron-right text-[#a1cf65]"></i>
          </button>
        ) : (state.currentInnings === 2 && state.isMatchOver) || (state.currentInnings === 1 && state.isMatchOver) ? (
          <button onClick={() => { localStorage.removeItem('active_match_state'); onFinish(state.matchHistory); }} className="w-full py-5 bg-[#004e35] text-white font-black text-lg rounded-[2.5rem] shadow-xl flex items-center justify-center space-x-3 border-b-4 border-[#003d2a] transition">
            <span>FINISH MATCH</span><i className="fas fa-flag-checkered text-[#a1cf65]"></i>
          </button>
        ) : null}
      </div>

      {showEditSettings && (
        <EditMatchSettingsModal
          settings={currentSettings}
          onSave={handleUpdateSettings}
          onCancel={() => setShowEditSettings(false)}
        />
      )}

      {showManageSquad && (
        <ManageSquadModal
          settings={currentSettings}
          onSave={handleUpdateSquad}
          onCancel={() => setShowManageSquad(false)}
        />
      )}
    </div>
  );
};

export default ScoringScreen;
