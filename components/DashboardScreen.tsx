
import React, { useState, useEffect, useRef } from 'react';
import { MatchSettings, MatchRecord } from '../types';
import DataExport from './DataExport';

interface DashboardScreenProps {
  onStartNew: () => void;
  onViewLive: (settings: MatchSettings) => void;
  onResumeScoring: (settings: MatchSettings) => void;
  onViewRecord?: (record: MatchRecord) => void; // New prop to view a specific match record
  recentRecords: MatchRecord[];
  isAuthorized: boolean; 
  authorizedMatchIds: Set<string>;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ 
  onStartNew, 
  onViewLive, 
  onResumeScoring, 
  onViewRecord,
  recentRecords, 
  isAuthorized, 
  authorizedMatchIds 
}) => {
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateRegistry = () => {
      const registry = JSON.parse(localStorage.getItem('match_registry') || '[]');
      setLiveMatches(registry);
    };
    updateRegistry();
    const interval = setInterval(updateRegistry, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (onViewRecord) onViewRecord(data);
      } catch (err) {
        alert("This doesn't look like a valid Batball match file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Club Archive Action */}
      <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-emerald-100 flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3">
          <i className="fab fa-whatsapp text-xl"></i>
        </div>
        <h3 className="font-black text-gray-800 uppercase italic tracking-tighter">Club Archive</h3>
        <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">Received a scorecard on WhatsApp?</p>
        <input type="file" ref={fileInputRef} onChange={handleOpenFile} className="hidden" accept=".json" />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition flex items-center justify-center space-x-2"
        >
          <i className="fas fa-file-import"></i>
          <span>Open Shared Scorecard</span>
        </button>
      </section>

      <section>
        <div className="flex justify-between items-end mb-4 px-2">
          <div>
            <h2 className="text-2xl font-black text-[#004e35] tracking-tight italic">Live Now</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active matches at the ground</p>
          </div>
          <button onClick={onStartNew} className="bg-[#004e35] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg hover:bg-[#006e4a] transition flex items-center">
            {!isAuthorized && <i className="fas fa-lock mr-2 text-[#a1cf65] text-[8px]"></i>}
            <i className="fas fa-plus mr-2 text-[#a1cf65]"></i>New Match
          </button>
        </div>

        {liveMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map((m) => {
              const hasAccess = isAuthorized || authorizedMatchIds.has(m.matchId);
              return (
                <div key={m.matchId} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition group flex flex-col">
                  <div className="bg-[#004e35] px-4 py-2 flex justify-between items-center">
                    <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em]">#{m.matchId}</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-[#a1cf65] rounded-full animate-pulse"></div>
                      <span className="text-[9px] font-black text-[#a1cf65] uppercase">Live</span>
                    </div>
                  </div>
                  <div className="p-6 flex-1">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-[#004e35] text-xs overflow-hidden bg-gray-100 border border-gray-200">
                            {m.settings.teamA.logo ? <img src={m.settings.teamA.logo} alt="" className="w-full h-full object-cover" /> : <span>{m.settings.teamA.name[0]}</span>}
                          </div>
                          <span className="font-bold text-gray-800">{m.settings.teamA.name}</span>
                        </div>
                        <span className="text-xl font-black text-[#004e35]">{m.score}/{m.wickets} <span className="text-xs text-gray-400 font-normal">({m.overs})</span></span>
                      </div>
                      <div className="flex justify-between items-center opacity-40">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-gray-400 text-xs overflow-hidden bg-gray-100">
                            {m.settings.teamB.logo ? <img src={m.settings.teamB.logo} alt="" className="w-full h-full object-cover" /> : <span>{m.settings.teamB.name[0]}</span>}
                          </div>
                          <span className="font-bold text-gray-800">{m.settings.teamB.name}</span>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">Wait</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 border-t border-gray-100 h-12">
                     <button onClick={() => onResumeScoring(m.settings)} className={`font-black text-[10px] uppercase tracking-widest transition flex items-center justify-center border-r border-gray-100 ${hasAccess ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}>
                       {!hasAccess && <i className="fas fa-lock mr-2 text-gray-300 text-[8px]"></i>}
                       <i className="fas fa-pencil mr-2"></i> Score
                     </button>
                     <button onClick={() => onViewLive(m.settings)} className="bg-white text-gray-600 font-black text-[10px] uppercase tracking-widest transition flex items-center justify-center">
                       <i className="fas fa-eye mr-2"></i> Live Feed
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] p-12 text-center">
            <div className="w-16 h-16 bg-[#f4f7f4] rounded-full flex items-center justify-center mx-auto mb-4 text-[#004e35]">
              <i className="fas fa-satellite-dish text-2xl"></i>
            </div>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">No active games</p>
          </div>
        )}
      </section>

      <section>
        <div className="px-2 mb-4">
          <h2 className="text-xl font-black text-[#004e35] tracking-tight italic">My Recent Scores</h2>
        </div>
        <div className="space-y-3">
          {recentRecords.slice(0, 3).map(rec => (
            <div key={rec.id} onClick={() => onViewRecord && onViewRecord(rec)} className="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-center hover:bg-emerald-50 transition cursor-pointer group">
              <div className="flex items-center space-x-4">
                <div className="text-center w-12 border-r border-gray-100 pr-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase">{new Date(rec.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                  <p className="text-lg font-black text-gray-800 leading-none">{new Date(rec.date).getDate()}</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{rec.settings.teamA.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">vs {rec.settings.teamB.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-[#004e35]">{rec.finalScore.runs}/{rec.finalScore.wickets}</p>
                <p className="text-[9px] text-gray-400 font-black uppercase">{rec.finalScore.overs} OV</p>
              </div>
            </div>
          ))}
          {recentRecords.length === 0 && (
             <p className="text-center py-8 text-gray-400 font-medium text-xs italic">No match history on this device.</p>
          )}
        </div>
      </section>

      <DataExport records={recentRecords} />
    </div>
  );
};

export default DashboardScreen;
