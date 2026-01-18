import React, { useRef } from 'react';
import { MatchRecord, MatchSettings, BallEvent, BallType, WicketType } from '../types';
import html2canvas from 'html2canvas';

interface ScorecardImageProps {
  record: MatchRecord;
  type: 'summary' | 'full';
  onDownload: () => void;
  onShare: () => void;
  matchNumber?: number;
}

const ScorecardImage: React.FC<ScorecardImageProps> = ({ record, type, onDownload, onShare, matchNumber }) => {
  const scoreboardRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (!scoreboardRef.current) return;

    try {
      const canvas = await html2canvas(scoreboardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `batball-${type}-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onDownload();
    } catch (err) {
      console.error('Error generating image:', err);
      alert('Failed to generate scorecard image');
    }
  };

  const handleShareImage = async () => {
    if (!scoreboardRef.current) return;

    try {
      const canvas = await html2canvas(scoreboardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });

      canvas.toBlob(async (blob) => {
        if (blob && navigator.share) {
          try {
            const file = new File([blob], `batball-${type}.png`, { type: 'image/png' });
            await navigator.share({
              files: [file],
              title: 'Match Scorecard',
              text: `Check out this match scorecard!`
            });
            onShare();
          } catch (err) {
            console.log('Share cancelled or failed');
          }
        } else {
          // Fallback: copy to clipboard
          blob.stream(); // Trigger download as fallback
          alert('Image copied to clipboard - paste in WhatsApp');
        }
      });
    } catch (err) {
      console.error('Error sharing image:', err);
    }
  };

  const matchDate = new Date(record.date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  if (type === 'summary') {
    return (
      <div ref={scoreboardRef} data-scorecard-image className="w-full max-w-md mx-auto p-6 bg-gradient-to-br from-[#004e35] to-[#003a27] rounded-2xl text-white" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black mb-1">
            {matchNumber ? `Match ${matchNumber} Scorecard` : 'Match Scorecard'}
          </h1>
          <p className="text-sm opacity-80">{matchDate}</p>
        </div>

        <div className="space-y-6">
          {/* Team A (First Innings) */}
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">1st Innings</p>
            <h2 className="text-2xl font-black mb-3">{record.settings.teamA.name}</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-xl font-black">
                <span>{record.finalScore.runs}</span>
                <span>/</span>
                <span>{record.finalScore.wickets}</span>
              </div>
              <div className="text-sm opacity-80">
                Overs: {record.finalScore.overs || '0.0'}
              </div>
            </div>
          </div>

          {/* Team B (Second Innings) */}
          {record.finalScore.target !== undefined && (
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur border-2 border-[#a1cf65]">
              <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">2nd Innings</p>
              <h2 className="text-2xl font-black mb-3">{record.settings.teamB.name}</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-lg font-black mb-2">
                  <span>Target: {record.finalScore.target}</span>
                </div>
                <div className="text-xs opacity-80 text-right">
                  {record.finalScore.winner && (
                    <p className="text-[#a1cf65] font-black">🏆 {record.finalScore.winner} WON</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Winner */}
          {record.finalScore.winner && (
            <div className="bg-[#a1cf65] text-[#004e35] rounded-xl p-4 text-center font-black">
              <p className="text-sm uppercase tracking-wider opacity-80">Winner</p>
              <p className="text-2xl">{record.finalScore.winner}</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 text-center text-xs opacity-60">
          Generated by Batball • {new Date().toLocaleTimeString()}
        </div>
      </div>
    );
  }

  // Full scorecard with detailed stats
  const calculateStats = (history: BallEvent[], players: any[], opponentPlayers: any[]) => {
    const batting: Record<string, any> = {};
    const bowling: Record<string, any> = {};

    players.forEach(p => {
      batting[p.id] = { name: p.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: 'not out' };
    });

    opponentPlayers.forEach(p => {
      bowling[p.id] = { name: p.name, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0 };
    });

    history.forEach((ball: BallEvent) => {
      const batter = batting[ball.strikerId];
      if (batter) {
        batter.runs += ball.runs;
        if (ball.type !== BallType.WIDE && ball.type !== BallType.NO_BALL) batter.balls += 1;
        if (ball.runs === 4) batter.fours += 1;
        if (ball.runs === 6) batter.sixes += 1;
        if (ball.wicket && ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED) {
          batter.isOut = true;
          const bowler = opponentPlayers.find((p: any) => p.id === ball.bowlerId)?.name || 'Bowler';
          let dismissalText = 'out';
          if (ball.wicket === WicketType.BOWLED) dismissalText = `b ${bowler}`;
          else if (ball.wicket === WicketType.CAUGHT) dismissalText = `c ${bowler}`;
          else if (ball.wicket === WicketType.LBW) dismissalText = `lbw b ${bowler}`;
          else if (ball.wicket === WicketType.RUN_OUT) dismissalText = 'run out';
          else if (ball.wicket === WicketType.STUMPED) dismissalText = `st ${bowler}`;
          batter.dismissal = dismissalText;
        }
      }

      const bowler = bowling[ball.bowlerId];
      if (bowler) {
        if (ball.type !== BallType.WIDE && ball.type !== BallType.NO_BALL) {
          bowler.balls += 1;
          bowler.runs += ball.runs;
          if (ball.wicket && ball.wicket !== WicketType.NONE && ball.wicket !== WicketType.RETIRED) bowler.wickets += 1;
        }
      }
    });

    return { batting: Object.values(batting), bowling: Object.values(bowling) };
  };

  const inningsOne = record.history.filter(b => b.innings === 1);
  const inningsTwo = record.history.filter(b => b.innings === 2);
  const statsOne = calculateStats(inningsOne, record.settings.teamA.players, record.settings.teamB.players);
  const statsTwo = inningsTwo.length > 0 ? calculateStats(inningsTwo, record.settings.teamB.players, record.settings.teamA.players) : null;

  // Calculate match result summary
  const teamAScore = record.finalScore.teamAScore?.runs || record.finalScore.runs || 0;
  const teamAWickets = record.finalScore.teamAScore?.wickets || record.finalScore.wickets || 0;
  const teamBScore = record.finalScore.teamBScore?.runs || 0;
  const teamBWickets = record.finalScore.teamBScore?.wickets || 0;
  
  let resultSummary = '';
  if (record.finalScore.winner) {
    if (record.finalScore.winner === record.settings.teamA.name) {
      // Team A (batting first) won
      const runDifference = teamAScore - teamBScore;
      resultSummary = `${record.settings.teamA.name} won by ${runDifference} run${runDifference !== 1 ? 's' : ''}`;
    } else {
      // Team B (batting second) won
      const totalBalls = record.settings.totalOvers * 6;
      const ballsBowled = inningsTwo.length;
      const ballsRemaining = totalBalls - ballsBowled;
      resultSummary = `${record.settings.teamB.name} won by ${ballsRemaining} ball${ballsRemaining !== 1 ? 's' : ''}`;
    }
  }

  return (
    <div ref={scoreboardRef} data-scorecard-image className="w-full max-w-4xl mx-auto p-8 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="text-center mb-6 pb-4 border-b-4 border-[#004e35]">
        <h1 className="text-4xl font-black text-[#004e35] mb-2">
          {matchNumber ? `Match ${matchNumber} Scorecard` : 'Match Scorecard'}
        </h1>
        <p className="text-gray-600 font-semibold text-lg">{matchDate}</p>
        <p className="text-gray-500 font-bold">{record.settings.teamA.name} vs {record.settings.teamB.name}</p>
      </div>

      {resultSummary && (
        <div className="mb-6 p-4 bg-gradient-to-r from-[#004e35] to-[#003a27] text-white rounded-lg text-center">
          <p className="text-lg font-black">{resultSummary}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Innings 1 */}
        <div>
          <h2 className="text-2xl font-black text-[#004e35] mb-4 border-b-2 border-[#a1cf65] pb-2">
            {record.settings.teamA.name} - 1st Innings
          </h2>
          
          <div className="mb-6 p-4 bg-emerald-50 rounded-lg">
            <p className="text-3xl font-black text-emerald-700 mb-2">
              {record.finalScore.teamAScore?.runs || record.finalScore.runs}/{record.finalScore.teamAScore?.wickets || record.finalScore.wickets}
            </p>
            <p className="text-sm text-gray-600 font-bold">Overs: {record.finalScore.teamAScore?.overs || record.finalScore.overs}</p>
          </div>

          <table className="w-full mb-6 text-sm border-collapse">
            <thead>
              <tr className="bg-[#004e35] text-white">
                <th className="border border-gray-300 p-2 text-left">Batter</th>
                <th className="border border-gray-300 p-2 text-center">R</th>
                <th className="border border-gray-300 p-2 text-center">B</th>
                <th className="border border-gray-300 p-2 text-center">4s</th>
                <th className="border border-gray-300 p-2 text-center">6s</th>
                <th className="border border-gray-300 p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {statsOne.batting.filter((bat: any) => bat.balls > 0).map((bat: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 p-2 font-semibold">{bat.name}</td>
                  <td className="border border-gray-300 p-2 text-center font-bold">{bat.runs}</td>
                  <td className="border border-gray-300 p-2 text-center">{bat.balls}</td>
                  <td className="border border-gray-300 p-2 text-center">{bat.fours}</td>
                  <td className="border border-gray-300 p-2 text-center">{bat.sixes}</td>
                  <td className="border border-gray-300 p-2 text-xs">{bat.isOut ? bat.dismissal : 'not out'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {statsOne.batting.some((bat: any) => bat.balls === 0) && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-bold text-gray-600 mb-2">Did not bat:</p>
              <p className="text-gray-600">{statsOne.batting.filter((bat: any) => bat.balls === 0).map((bat: any) => bat.name).join(', ')}</p>
            </div>
          )}

          <table className="w-full mb-6 text-sm border-collapse">
            <thead>
              <tr className="bg-[#004e35] text-white">
                <th className="border border-gray-300 p-2 text-left">Bowler</th>
                <th className="border border-gray-300 p-2 text-center">O</th>
                <th className="border border-gray-300 p-2 text-center">M</th>
                <th className="border border-gray-300 p-2 text-center">R</th>
                <th className="border border-gray-300 p-2 text-center">W</th>
              </tr>
            </thead>
            <tbody>
              {statsOne.bowling.filter((bowl: any) => bowl.balls > 0).map((bowl: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 p-2 font-semibold">{bowl.name}</td>
                  <td className="border border-gray-300 p-2 text-center">{Math.floor(bowl.balls / 6)}.{bowl.balls % 6}</td>
                  <td className="border border-gray-300 p-2 text-center">{bowl.maidens}</td>
                  <td className="border border-gray-300 p-2 text-center font-bold">{bowl.runs}</td>
                  <td className="border border-gray-300 p-2 text-center font-bold">{bowl.wickets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Innings 2 */}
        {statsTwo && (
          <div>
            <h2 className="text-2xl font-black text-[#004e35] mb-4 border-b-2 border-blue-400 pb-2">
              {record.settings.teamB.name} - 2nd Innings
            </h2>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-black text-blue-700 mb-2">
                {record.finalScore.teamBScore?.runs || '0'}/{record.finalScore.teamBScore?.wickets || '0'}
              </p>
              <p className="text-sm text-gray-600 font-bold">Overs: {record.finalScore.teamBScore?.overs || '0'}</p>
              {record.finalScore.target && (
                <p className="text-sm text-gray-600 font-bold mt-1">Target: {record.finalScore.target}</p>
              )}
            </div>

            <table className="w-full mb-6 text-sm border-collapse">
              <thead>
                <tr className="bg-[#004e35] text-white">
                  <th className="border border-gray-300 p-2 text-left">Batter</th>
                  <th className="border border-gray-300 p-2 text-center">R</th>
                  <th className="border border-gray-300 p-2 text-center">B</th>
                  <th className="border border-gray-300 p-2 text-center">4s</th>
                  <th className="border border-gray-300 p-2 text-center">6s</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {statsTwo.batting.filter((bat: any) => bat.balls > 0).map((bat: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-2 font-semibold">{bat.name}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold">{bat.runs}</td>
                    <td className="border border-gray-300 p-2 text-center">{bat.balls}</td>
                    <td className="border border-gray-300 p-2 text-center">{bat.fours}</td>
                    <td className="border border-gray-300 p-2 text-center">{bat.sixes}</td>
                    <td className="border border-gray-300 p-2 text-xs">{bat.isOut ? bat.dismissal : 'not out'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {statsTwo.batting.some((bat: any) => bat.balls === 0) && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-bold text-gray-600 mb-2">Did not bat:</p>
                <p className="text-gray-600">{statsTwo.batting.filter((bat: any) => bat.balls === 0).map((bat: any) => bat.name).join(', ')}</p>
              </div>
            )}

            <table className="w-full mb-6 text-sm border-collapse">
              <thead>
                <tr className="bg-[#004e35] text-white">
                  <th className="border border-gray-300 p-2 text-left">Bowler</th>
                  <th className="border border-gray-300 p-2 text-center">O</th>
                  <th className="border border-gray-300 p-2 text-center">M</th>
                  <th className="border border-gray-300 p-2 text-center">R</th>
                  <th className="border border-gray-300 p-2 text-center">W</th>
                </tr>
              </thead>
              <tbody>
                {statsTwo.bowling.filter((bowl: any) => bowl.balls > 0).map((bowl: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-2 font-semibold">{bowl.name}</td>
                    <td className="border border-gray-300 p-2 text-center">{Math.floor(bowl.balls / 6)}.{bowl.balls % 6}</td>
                    <td className="border border-gray-300 p-2 text-center">{bowl.maidens}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold">{bowl.runs}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold">{bowl.wickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t-2 border-gray-300 text-center text-xs text-gray-500">
        Generated by Batball Scorer • {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default ScorecardImage;
