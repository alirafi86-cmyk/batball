# Batball Scorer - Architecture & Development Guide

## Overview
Batball is an offline-first cricket scoring app built with React + TypeScript + Vite. This guide helps developers understand the codebase architecture and make future enhancements.

---

## Core Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript
- **Build**: Vite 6.4.1
- **Styling**: Tailwind CSS
- **Storage**: localStorage only (no backend)
- **Icons**: Font Awesome 6

### Project Structure
```
batball/
├── components/              # React components
│   ├── ScoringScreen.tsx   # Main match scoring interface
│   ├── DashboardScreen.tsx # Match list & history
│   ├── StatsScreen.tsx     # Player statistics & scorecards
│   ├── SetupScreen.tsx     # Match setup/toss
│   ├── LiveView.tsx        # Live match display (read-only)
│   ├── SummaryScreen.tsx   # Post-match summary
│   ├── EditMatchSettingsModal.tsx  # Edit overs/team names
│   ├── ManageSquadModal.tsx        # Edit squad players
│   ├── ScorerAuthModal.tsx         # PIN authentication
│   ├── ErrorBoundary.tsx
│   ├── DataExport.tsx
│   └── [other components]
├── types.ts                # TypeScript interfaces & enums
├── App.tsx                 # Main app component
├── index.tsx               # Entry point
└── vite.config.ts          # Vite configuration
```

---

## Data Model (types.ts)

### Key Interfaces

#### BallEvent
Represents a single delivery (legal or extra):
```typescript
interface BallEvent {
  id: string;              // Unique identifier
  runs: number;            // Runs scored (0-6, or 1-2 for extras)
  type: BallType;          // NORMAL | WIDE | NO_BALL
  wicket: WicketType;      // BOWLED | CAUGHT | LBW | RUN_OUT | STUMPED | RETIRED | NONE
  strikerId: string;       // Player ID of batter
  bowlerId: string;        // Player ID of bowler
  innings: 1 | 2;          // First or second innings
  timestamp: number;       // Milliseconds when recorded
  over?: number;           // Over number (0-indexed) for display
}
```

#### MatchSettings
Configuration for a match:
```typescript
interface MatchSettings {
  matchId: string;           // Unique match identifier
  totalOvers: number;        // Match overs (e.g., 20)
  playersPerTeam: number;    // Players each team uses
  retirementLimit: number;   // Balls before auto-retirement
  teamA: Team;               // First team
  teamB: Team;               // Second team
  scorerPin: string;         // Optional PIN for auth
}
```

#### MatchState
Current match progress (stored in localStorage as `active_match_state`):
```typescript
interface MatchState {
  currentInnings: 1 | 2;
  score: number;             // Current team's runs
  wickets: number;           // Current team's wickets
  ballsInOver: number;       // Legal balls (0-6)
  totalBalls: number;        // Total legal balls bowled
  strikerId: string;         // Current batter
  nonStrikerId: string;      // Non-striker batter
  bowlerId: string;          // Current bowler
  matchHistory: BallEvent[]; // All balls bowled
  isMatchOver: boolean;
  retiredPlayerIds: string[];
  firstInningsScore?: number; // Saved when innings 1 ends
}
```

---

## State Management

### localStorage Keys
Batball uses localStorage for complete offline persistence:

1. **`active_match_state`** (JSON)
   - Current match progress
   - Updated after every ball
   - Cleared when match finishes

2. **`active_match_settings`** (JSON)
   - Current match configuration
   - Can be edited mid-match via "Overs" button

3. **`match_registry`** (JSON Array)
   - List of live matches
   - Each match has: matchId, settings, score, wickets, overs, innings
   - Cleared when match is deleted

4. **`cricket_history`** (JSON Array)
   - Completed match records
   - Each record has: id, date, settings, history, finalScore
   - Survives app reload
   - Can be deleted manually

### State Flow

```
Setup Screen
    ↓
    └→ Create MatchSettings + MatchState
    
ScoringScreen (Main Loop)
    ├→ addBall() triggered by user click
    ├→ Calculate new state (next score, wickets, etc.)
    ├→ Add ball to matchHistory with over number
    ├→ Update localStorage
    ├→ Show modals if needed (batter/bowler select, wicket, runout)
    └→ Repeat until innings/match over
    
DashboardScreen
    ├→ Reads match_registry (live matches)
    ├→ Reads cricket_history (completed matches)
    └→ Can delete matches with confirmation
```

---

## Key Components & Features

### 1. ScoringScreen.tsx - Main Match Scoring

**Location**: `components/ScoringScreen.tsx`

**Core State**:
- `state` (MatchState) - Current match progress
- `currentSettings` (MatchSettings) - Match configuration
- `activeExtra` (BallType) - Armed extra (WIDE/NO_BALL)
- `showBatterSelect` - Modal state for batter selection (including 3-step runout)
- `showBowlerSelect` - Modal state for bowler selection
- `showWicketModal` - Modal state for wicket type selection

**Key Functions**:
- `addBall(runs, type, wicket)` - Records a ball, updates score/wickets
- `handleUpdateSettings()` - Saves team name/over changes
- `handleTransitionInnings()` - Starts innings 2

**Over Counter Logic**:
- Displays only current over's balls (filtered by `over` number)
- Shows: runs (0-6), W (wicket), R (retirement), WD (wide), NB (no ball)
- Updates in real-time as balls are bowled

**Important**: The `currentOverBalls` useMemo filters by:
```typescript
ball.innings === state.currentInnings && 
ball.over === currentOver &&
ball.wicket !== WicketType.RETIRED
```

### 2. DashboardScreen.tsx - Match Management

**Location**: `components/DashboardScreen.tsx`

**Features**:
- Live Now: Shows active matches with Score/Live/Delete buttons
- My Recent Scores: Shows completed matches with Edit/Delete buttons
- Delete confirmation dialogs prevent accidental deletion

**Key Logic**:
```javascript
// Live match delete
const registry = JSON.parse(localStorage.getItem('match_registry') || '[]');
localStorage.setItem('match_registry', JSON.stringify(
  registry.filter(x => x.matchId !== m.matchId)
));

// Scorecard delete
const updated = recentRecords.filter(r => r.id !== rec.id);
localStorage.setItem('cricket_history', JSON.stringify(updated));
```

### 3. Runout Handling - 3-Step Modal

**Location**: `components/ScoringScreen.tsx` (lines ~560-640)

**Flow**:
1. User clicks "Wicket" → selects RUN_OUT
2. Step 1: "Who was run out?" (striker or non-striker)
3. Step 2: "Select New Batsman" (available players)
4. Step 3: "Which End?" (striker or non-striker end)
5. Modal closes and state updates

**State Tracking**:
```typescript
showBatterSelect: {
  active: boolean;
  target: 'striker' | 'nonStriker' | 'runout' | 'runoutNew' | 'runoutEnd';
  forceSelection?: boolean;
  runoutOutId?: string;  // Player who was out
  runoutNewId?: string;  // Replacement player
}
```

### 4. Edit Team Names - Two Locations

**During Match** (`EditMatchSettingsModal.tsx`):
- Click "Overs" button on ScoringScreen
- Edit Team A/B names
- Changes persist immediately to localStorage

**Post-Match** (`StatsScreen.tsx`):
- View completed scorecard
- Click "Edit Team Names" button
- Modal to correct historical team names
- Updates both cricket_history and match_registry

### 5. Ball Counter Display

**Showing Current Over Only**:
- Each ball has an `over` field (0-indexed)
- `currentOverBalls` useMemo filters: `ball.over === Math.floor(state.totalBalls / 6)`
- Displays up to 6 legal balls + any extras
- Shows: normal runs, W (wicket), R (retirement)
- Extras: WD (wide blue), NB (no ball purple)
- Format: "WD+1" for wide with 1 run

---

## Making Changes: Key Areas

### To Change Scoring Rules
1. **Ball runs logic**: `addBall()` function, `nextScore` calculation
2. **Wickets logic**: `nextWickets` calculation, wicket type handling
3. **Over logic**: `nextBallsInOver` and `nextTotalBalls` counting
4. **Match end logic**: `isGameOver` condition in addBall

### To Change UI/Display
1. **Over counter**: `currentOverBalls` useMemo filter + display template
2. **Buttons layout**: Grid classes in ScoringScreen JSX
3. **Modals**: JSX in showBatterSelect/showBowlerSelect/showWicketModal sections
4. **Colors**: Tailwind classes (emerald, red, blue, purple, amber)

### To Add Features
1. **New ball types**: Add to BallType enum in types.ts
2. **New wicket types**: Add to WicketType enum in types.ts
3. **New modals**: Create state in ScoringScreen, add JSX conditional render
4. **New screens**: Create component, add route in App.tsx

### To Fix Bugs
1. **Check localStorage state**: Use browser DevTools → Application → Storage
2. **Trace logic**: Follow `addBall()` → state calculation → localStorage save
3. **Test edge cases**: First ball, first over, first wicket, match transitions
4. **Verify data persistence**: Reload page and check if state recovered

---

## Common Issues & Solutions

### Issue: Ball doesn't appear in over counter
**Cause**: Ball's `over` field doesn't match current over number
**Solution**: Ensure `over: Math.floor(prev.totalBalls / 6)` in addBall

### Issue: First wide/no ball doesn't show
**Cause**: Previous logic returned `[]` when `ballsInOver === 0`
**Solution**: Now returns all balls including first extra

### Issue: Match ends too early
**Cause**: isGameOver condition too aggressive
**Solution**: Check that `firstInningsScore` is properly set before innings 2

### Issue: Delete without confirmation
**Cause**: Missing `window.confirm()` check
**Solution**: All delete buttons now require confirmation dialog

### Issue: Over counter shows old balls
**Cause**: Filter not including current over's balls properly
**Solution**: Verify filter: `ball.over === Math.floor(state.totalBalls / 6)`

---

## Deployment

### Build
```bash
npm run build
```
Output: `dist/` folder with production build

### Preview Locally
```bash
npx vite preview --port 4173
```

### Deploy to Vercel
```bash
git add .
git commit -m "Feature: [description]"
git push origin main
# Vercel auto-deploys from main branch
```

---

## Testing Checklist

Before deploying changes, verify:

- [ ] No TypeScript errors: `npm run build`
- [ ] First over shows balls correctly (including first wide/no ball)
- [ ] Runout 3-step modal works end-to-end
- [ ] Delete buttons show confirmation dialogs
- [ ] Target displays correctly in second innings
- [ ] Team names can be edited during match
- [ ] Team names can be edited post-match
- [ ] Over counter shows only current over
- [ ] Extras show with correct labels (WD, NB)
- [ ] Match doesn't end prematurely
- [ ] localStorage persists after page reload
- [ ] Undo button reverses the last ball

---

## Future Enhancement Ideas

1. **Live multiplayer**: Real-time score sync via WebSocket
2. **Cloud storage**: Optional backup to cloud
3. **Advanced stats**: Economy rate, strike rate, bowling analysis
4. **Video highlights**: Integrate match clips
5. **Leaderboards**: Season-long statistics tracking
6. **Mobile app**: React Native wrapper for iOS/Android
7. **Commentary**: Live text commentary feature
8. **Umpire mode**: Off-field umpire view with alerts

---

## Questions or Issues?

Refer to the section headers above to find the relevant code area. All core logic is in:
- **Scoring**: `ScoringScreen.tsx` lines 138-230 (addBall function)
- **Display**: `ScoringScreen.tsx` lines 108-117 (currentOverBalls useMemo)
- **Runout**: `ScoringScreen.tsx` lines ~560-640 (3-step modal)
- **Persistence**: `ScoringScreen.tsx` lines 42-64 (useEffect with localStorage)
