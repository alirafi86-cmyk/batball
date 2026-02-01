
import React, { useState, useEffect, useRef } from 'react';
import SetupScreen from './components/SetupScreen';
import ScoringScreen from './components/ScoringScreen';
import SummaryScreen from './components/SummaryScreen';
import StatsScreen from './components/StatsScreen';
import LiveView from './components/LiveView';
import DashboardScreen from './components/DashboardScreen';
import ScorerAuthModal from './components/ScorerAuthModal';
import ErrorBoundary from './components/ErrorBoundary';
import { MatchSettings, BallEvent, MatchRecord } from './types';

export enum Screen {
  DASHBOARD,
  SETUP,
  SCORING,
  SUMMARY,
  STATS,
  LIVE,
  RECORD_VIEW
}

const MASTER_CLUB_PIN = '3425';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.DASHBOARD);
  const [matchSettings, setMatchSettings] = useState<MatchSettings | null>(null);
  const [finalHistory, setFinalHistory] = useState<BallEvent[]>([]);
  const [historyRecords, setHistoryRecords] = useState<MatchRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MatchRecord | null>(null);
  
  const [authorizedMatchIds, setAuthorizedMatchIds] = useState<Set<string>>(() => {
    const saved = sessionStorage.getItem('authorized_match_ids');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [isClubAdmin, setIsClubAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('is_club_admin') === 'true';
  });

  const isNavigatingManually = useRef(false);

  const [showAuthModal, setShowAuthModal] = useState<{ active: boolean; nextScreen: Screen; pendingSettings?: MatchSettings }>({ 
    active: false, 
    nextScreen: Screen.DASHBOARD 
  });

  useEffect(() => {
    const savedHistory = localStorage.getItem('cricket_history');
    if (savedHistory) {
      try { setHistoryRecords(JSON.parse(savedHistory)); } catch(e) {}
    }
  }, []);

  const handleAuthSuccess = () => {
    const { nextScreen, pendingSettings } = showAuthModal;
    if (pendingSettings) {
      const updatedMatchIds = new Set(authorizedMatchIds).add(pendingSettings.matchId);
      setAuthorizedMatchIds(updatedMatchIds);
      sessionStorage.setItem('authorized_match_ids', JSON.stringify(Array.from(updatedMatchIds)));
      setMatchSettings(pendingSettings);
      localStorage.setItem('active_match_settings', JSON.stringify(pendingSettings));
    } else {
      setIsClubAdmin(true);
      sessionStorage.setItem('is_club_admin', 'true');
    }
    setCurrentScreen(nextScreen);
    setShowAuthModal({ active: false, nextScreen: Screen.DASHBOARD });
  };

  const handleViewRecord = (record: MatchRecord) => {
    setSelectedRecord(record);
    setCurrentScreen(Screen.RECORD_VIEW);
  };

  const handleUpdateRecords = (updatedRecords: MatchRecord[], updatedMatch?: MatchRecord) => {
    setHistoryRecords(updatedRecords);
    if (updatedMatch) {
      setSelectedRecord(prev => (prev && prev.id === updatedMatch.id ? updatedMatch : prev));
    }
  };

  const handleSaveMatch = (record: MatchRecord) => {
    const updated = [record, ...historyRecords];
    setHistoryRecords(updated);
    localStorage.setItem('cricket_history', JSON.stringify(updated));
    const registry = JSON.parse(localStorage.getItem('match_registry') || '[]');
    localStorage.setItem('match_registry', JSON.stringify(registry.filter((m: any) => m.matchId !== record.settings.matchId)));
    localStorage.removeItem('active_match_settings');
    localStorage.removeItem('active_match_state');
    setMatchSettings(null);
    setCurrentScreen(Screen.DASHBOARD);
  };

  const handleReset = () => {
    setMatchSettings(null);
    setSelectedRecord(null);
    setCurrentScreen(Screen.DASHBOARD);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f4f7f4] pb-12">
      <header className="bg-[#004e35] text-white p-4 shadow-2xl border-b border-[#003d2a] sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center max-w-4xl">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleReset}>
            <i className="fas fa-baseball-bat-ball text-2xl text-[#a1cf65]"></i>
            <h1 className="text-xl font-black tracking-tighter italic uppercase">BATBALL</h1>
          </div>
          <nav className="flex items-center space-x-2">
            <button onClick={() => setCurrentScreen(Screen.DASHBOARD)} className={`text-[9px] font-bold uppercase tracking-widest px-3 py-2 rounded-xl transition ${currentScreen === Screen.DASHBOARD ? 'bg-[#a1cf65] text-[#004e35]' : 'text-gray-300'}`}>Feed</button>
            <button onClick={() => setCurrentScreen(Screen.STATS)} className={`text-[9px] font-bold uppercase tracking-widest px-3 py-2 rounded-xl transition ${currentScreen === Screen.STATS ? 'bg-[#a1cf65] text-[#004e35]' : 'text-gray-300'}`}>Club Hub</button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {currentScreen === Screen.DASHBOARD && (
          <DashboardScreen 
            onStartNew={() => setShowAuthModal({ active: true, nextScreen: Screen.SETUP })} 
            onViewLive={(s) => { setMatchSettings(s); setCurrentScreen(Screen.LIVE); }}
            onResumeScoring={(s) => { setMatchSettings(s); setCurrentScreen(Screen.SCORING); }}
            onViewRecord={handleViewRecord}
            recentRecords={historyRecords}
            isAuthorized={isClubAdmin}
            authorizedMatchIds={authorizedMatchIds}
          />
        )}
        {currentScreen === Screen.RECORD_VIEW && selectedRecord && (
          <StatsScreen records={historyRecords} initialMatch={selectedRecord} onUpdateRecords={handleUpdateRecords} />
        )}
        {currentScreen === Screen.SETUP && (
          <SetupScreen onStart={(s) => { setMatchSettings(s); setCurrentScreen(Screen.SCORING); }} />
        )}
        {currentScreen === Screen.SCORING && matchSettings && (
          <ScoringScreen settings={matchSettings} onFinish={(h) => { setFinalHistory(h); setCurrentScreen(Screen.SUMMARY); }} onUpdateSettings={setMatchSettings} />
        )}
        {currentScreen === Screen.SUMMARY && matchSettings && (
          <SummaryScreen settings={matchSettings} history={finalHistory} onSave={handleSaveMatch} onBackToSetup={handleReset} />
        )}
        {currentScreen === Screen.STATS && (
          <StatsScreen records={historyRecords} onUpdateRecords={handleUpdateRecords} />
        )}
        {currentScreen === Screen.LIVE && matchSettings && (
          <LiveView settings={matchSettings} onManage={() => setCurrentScreen(Screen.SCORING)} />
        )}
      </main>

      {showAuthModal.active && (
        <ScorerAuthModal 
          requiredPin={showAuthModal.pendingSettings ? showAuthModal.pendingSettings.scorerPin : MASTER_CLUB_PIN}
          onSuccess={handleAuthSuccess} 
          onCancel={() => setShowAuthModal({ active: false, nextScreen: Screen.DASHBOARD })} 
        />
      )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
