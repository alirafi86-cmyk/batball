import { MatchRecord, PlayerCareerStats, BallEvent } from '../types';

export const calculatePlayerStats = (): Map<string, PlayerCareerStats> => {
  const records: MatchRecord[] = JSON.parse(localStorage.getItem('match_records') || '[]');
  const statsMap = new Map<string, PlayerCareerStats>();

  records.forEach(record => {
    record.history.forEach((ball: BallEvent) => {
      // Batter stats
      const batterId = ball.strikerId;
      const batter = record.settings.teamA.players.find(p => p.id === batterId) ||
                     record.settings.teamB.players.find(p => p.id === batterId);

      if (batter) {
        const key = `${batterId}`;
        const existing = statsMap.get(key) || {
          playerId: batterId,
          playerName: batter.name,
          runs: 0,
          balls: 0,
          wickets: 0,
          overs: 0,
          innings: 0,
          average: 0,
          strikeRate: 0,
          bestBowlingOvers: '0/0',
          bestBowlingRuns: 0
        };

        existing.runs += ball.runs;
        existing.balls += 1;

        statsMap.set(key, existing);
      }

      // Bowler stats
      const bowlerId = ball.bowlerId;
      const bowler = record.settings.teamA.players.find(p => p.id === bowlerId) ||
                     record.settings.teamB.players.find(p => p.id === bowlerId);

      if (bowler && ball.type.toString() === 'NORMAL') {
        const key = `${bowlerId}`;
        const existing = statsMap.get(key) || {
          playerId: bowlerId,
          playerName: bowler.name,
          runs: 0,
          balls: 0,
          wickets: 0,
          overs: 0,
          innings: 0,
          average: 0,
          strikeRate: 0,
          bestBowlingOvers: '0/0',
          bestBowlingRuns: 0
        };

        existing.overs += 1 / 6; // Add 1 ball to overs
        if (ball.wicket !== 'NONE' && ball.wicket !== 'RETIRED') {
          existing.wickets += 1;
        }

        statsMap.set(key, existing);
      }
    });
  });

  // Calculate derived stats
  statsMap.forEach(stat => {
    stat.average = stat.balls > 0 ? Number((stat.runs / stat.balls).toFixed(2)) : 0;
    stat.strikeRate = stat.balls > 0 ? Number((stat.runs / stat.balls * 100).toFixed(1)) : 0;
    stat.innings = stat.balls > 0 ? 1 : 0; // Simplified: assume 1 innings if batted
  });

  return statsMap;
};

export const getPlayerStats = (playerId: string): PlayerCareerStats | null => {
  const statsMap = calculatePlayerStats();
  return statsMap.get(playerId) || null;
};

export const getAllPlayerStats = (): PlayerCareerStats[] => {
  const statsMap = calculatePlayerStats();
  return Array.from(statsMap.values())
    .sort((a, b) => b.runs - a.runs); // Sort by runs descending
};
