
import React from 'react';
import { Player, BallEvent, BattingStats, BowlingStats, BallType, WicketType } from '../types';

interface ScorecardTableProps {
  players: Player[];
  history: BallEvent[];
  teamName: string;
  opponentPlayers: Player[];
}

export const ScorecardTable: React.FC<ScorecardTableProps> = ({ players, history, teamName, opponentPlayers }) => {
  const stats = React.useMemo(() => {
    const batting: Record<string, BattingStats & { dismissalText: string }> = {};
    const bowling: Record<string, BowlingStats> = {};
    let totalRuns = 0;
    let totalWickets = 0;
    let wides = 0;
    let noBalls = 0;
    let totalBalls = 0;

    players.forEach(p => {
      batting[p.id] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissalText: 'not out' };
    });

    opponentPlayers.forEach(p => {
      bowling[p.id] = { overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0 };
    });

    history.forEach(ball => {
      // Batting calculations
      const b = batting[ball.strikerId];
      if (b) {
        b.runs += ball.runs;
        if (ball.type === BallType.NORMAL) b.balls += 1;
        if (ball.runs === 4) b.fours += 1;
        if (ball.runs === 6) b.sixes += 1;
        
        if (ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED) {
          b.isOut = true;
          totalWickets += 1;
          const bowlerName = opponentPlayers.find(p => p.id === ball.bowlerId)?.name || 'Bowler';
          
          switch(ball.wicket) {
            case WicketType.BOWLED: b.dismissalText = `b ${bowlerName}`; break;
            case WicketType.LBW: b.dismissalText = `lbw b ${bowlerName}`; break;
            case WicketType.CAUGHT: b.dismissalText = `c & b ${bowlerName}`; break;
            case WicketType.STUMPED: b.dismissalText = `st b ${bowlerName}`; break;
            case WicketType.RUN_OUT: b.dismissalText = `run out`; break;
            default: b.dismissalText = `out`;
          }
        } else if (ball.wicket === WicketType.RETIRED) {
          b.isOut = false; // Retired is not technically 'out' for average purposes in many friendly rules
          b.dismissalText = 'ret.';
        }
      }

      // Extras & Team Total
      totalRuns += ball.runs;
      if (ball.type === BallType.WIDE) {
        wides += 1;
        totalRuns += 1;
      }
      if (ball.type === BallType.NO_BALL) {
        noBalls += 1;
        totalRuns += 1;
      }
      if (ball.type === BallType.NORMAL) {
        totalBalls += 1;
      }

      // Bowling calculations
      const bw = bowling[ball.bowlerId];
      if (bw) {
        const ballRuns = ball.runs + (ball.type !== BallType.NORMAL ? 1 : 0);
        bw.runs += ballRuns;
        if (ball.type === BallType.NORMAL) {
          bw.balls += 1;
          if (bw.balls === 6) {
            bw.overs += 1;
            bw.balls = 0;
          }
        }
        if (ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED) {
          bw.wickets += 1;
        }
      }
    });

    return { batting, bowling, totalRuns, totalWickets, wides, noBalls, totalBalls };
  }, [players, history, opponentPlayers]);

  const currentOverCount = `${Math.floor(stats.totalBalls / 6)}.${stats.totalBalls % 6}`;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{teamName} Batting</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100 bg-gray-50/20">
                <th className="px-6 py-4 w-1/3">Batter</th>
                <th className="px-2 py-4">Status</th>
                <th className="px-4 py-4 text-center">R</th>
                <th className="px-4 py-4 text-center">B</th>
                <th className="px-4 py-4 text-right">SR</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => {
                const s = stats.batting[p.id];
                if (s.balls === 0 && s.dismissalText === 'not out') return null;
                return (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-emerald-50/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-black text-gray-900">{p.name}</div>
                    </td>
                    <td className="px-2 py-4 text-[10px] text-emerald-600 font-bold italic">
                      {s.dismissalText}
                    </td>
                    <td className="px-4 py-4 text-center font-black text-gray-900">{s.runs}</td>
                    <td className="px-4 py-4 text-center text-gray-400 font-bold">{s.balls}</td>
                    <td className="px-6 py-4 text-right font-mono text-[10px] text-gray-400">
                      {s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(1) : '0.0'}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50/50 border-t border-gray-100">
                <td className="px-6 py-3 font-bold text-gray-400">Extras</td>
                <td colSpan={1} className="px-2 py-3 text-[10px] text-gray-400 font-bold">
                  (w {stats.wides}, nb {stats.noBalls})
                </td>
                <td className="px-4 py-3 text-center font-black text-gray-700">{stats.wides + stats.noBalls}</td>
                <td colSpan={2}></td>
              </tr>
              <tr className="bg-[#004e35] text-white">
                <td className="px-6 py-5 font-black text-sm uppercase tracking-tighter">TOTAL</td>
                <td colSpan={1} className="px-2 py-5 text-[10px] font-black text-emerald-300 uppercase tracking-widest">
                  {currentOverCount} Ov
                </td>
                <td className="px-4 py-5 text-center font-black text-xl">
                  {stats.totalRuns}/{stats.totalWickets}
                </td>
                <td colSpan={2} className="px-6 py-5 text-right text-[10px] font-black uppercase text-emerald-300">
                   RR: {(stats.totalRuns / (stats.totalBalls/6 || 1)).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Bowling</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100 bg-gray-50/20">
              <th className="px-6 py-4">Bowler</th>
              <th className="px-4 py-4 text-center">O</th>
              <th className="px-4 py-4 text-center">R</th>
              <th className="px-4 py-4 text-center">W</th>
              <th className="px-6 py-4 text-right">Econ</th>
            </tr>
          </thead>
          <tbody>
            {opponentPlayers.map(p => {
              const s = stats.bowling[p.id];
              if (s.overs === 0 && s.balls === 0) return null;
              return (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-red-50/30 transition">
                  <td className="px-6 py-4 font-black text-gray-900">{p.name}</td>
                  <td className="px-4 py-4 text-center text-gray-700 font-bold">{s.overs}.{s.balls}</td>
                  <td className="px-4 py-4 text-center font-black text-red-600">{s.runs}</td>
                  <td className="px-4 py-4 text-center font-black text-gray-900">{s.wickets}</td>
                  <td className="px-6 py-4 text-right font-mono text-[10px] text-gray-400">
                    {((s.runs) / (s.overs + s.balls/6 || 1)).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
