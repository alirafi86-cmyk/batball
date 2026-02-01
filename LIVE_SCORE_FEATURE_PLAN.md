# Live Score Feature Implementation Plan
## Real-Time Score Sharing for Club Members

**Created:** January 31, 2026  
**Target Version:** v3.0  
**Status:** Planning Phase

---

## 1. Feature Overview

Enable club members to view live cricket scores in real-time as the scorer enters ball-by-ball data. Multiple users can watch a match simultaneously without needing to refresh the page.

### Key Use Cases
- **Primary Scorer:** Enters ball data, manages match (existing functionality)
- **Club Members:** Join a live match using a share code, view real-time updates
- **Spectators:** Watch live scoreboard, commentary, and team stats
- **Multiple Viewers:** Unlimited concurrent viewers per match

---

## 2. Current Architecture Analysis

### Existing Stack
- **Frontend:** React 19 + TypeScript + Vite
- **Storage:** localStorage (browser local storage only)
- **Data Flow:** One-way (user input → state → localStorage)
- **Architecture:** Client-side only, no backend or real-time communication

### Current Data Model
```
localStorage keys:
- match_registry: List of all matches with metadata
- active_match_state: Current match state (balls, runs, wickets, etc.)
- active_match_settings: Match config (teams, players, overs)
- cricket_history: Historical match data
```

### Key Components
- `ScoringScreen.tsx`: Main scoring interface (ball entry, state management)
- `DashboardScreen.tsx`: Match management, match selection
- `types.ts`: TypeScript interfaces (BallEvent, MatchState, Team, etc.)

---

## 3. Proposed Architecture

### High-Level Data Flow

```
Scorer (ScoringScreen)
    ↓
[State Update] → Backend API → WebSocket Server
    ↓
Database (Firestore/Postgres/MongoDB)
    ↓
WebSocket Broadcast
    ↓
Viewers (LiveScoreViewer) ← Subscribe to match updates
```

### Technology Stack (Recommended)

#### Option A: Firebase (Easiest for MVP)
- **Real-time Database:** Firebase Realtime Database
- **Authentication:** Firebase Auth
- **Hosting:** Firebase Hosting (optional, can use Vercel)
- **Pros:** Managed service, easy to set up, real-time by default, free tier
- **Cons:** Firebase pricing at scale, vendor lock-in

#### Option B: Supabase + Socket.io (More Control)
- **Backend:** Node.js + Express
- **Real-time:** Socket.io or WebSocket
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth or JWT
- **Hosting:** Vercel (frontend), Railway/Render (backend)
- **Pros:** Open source, full control, good free tier, similar to Firebase DX
- **Cons:** Need to manage backend server

#### Option C: Hybrid (Recommended)
- **Primary:** Firebase Realtime Database for MVP speed
- **Migration Path:** Can migrate to Supabase + Node.js backend later
- **Best of Both:** Quick initial launch, clear upgrade path

---

## 4. Detailed Implementation Plan

### Phase 1: Backend Infrastructure Setup (Week 1-2)

#### 4.1 Choose Platform
- [ ] Decision: Firebase vs Supabase vs Custom Backend
- [ ] Create backend project/database
- [ ] Set up authentication system
- [ ] Create database schema

#### 4.2 Database Schema (If Supabase/Custom Backend)
```sql
-- Matches table (shared by all viewers)
CREATE TABLE live_matches (
  id UUID PRIMARY KEY,
  share_code VARCHAR(6) UNIQUE,
  scorer_id UUID NOT NULL,
  team_1_name VARCHAR(100),
  team_2_name VARCHAR(100),
  status VARCHAR(50), -- 'live', 'completed', 'paused'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Real-time match state
CREATE TABLE match_states (
  id UUID PRIMARY KEY,
  match_id UUID FOREIGN KEY,
  current_innings INT,
  total_balls INT,
  runs INT,
  wickets INT,
  extras INT,
  last_ball JSON, -- Last ball event details
  updated_at TIMESTAMP
);

-- Ball-by-ball events (for replay/commentary)
CREATE TABLE ball_events (
  id UUID PRIMARY KEY,
  match_id UUID FOREIGN KEY,
  ball_number INT,
  over INT,
  runs INT,
  wicket BOOLEAN,
  commentary TEXT,
  timestamp TIMESTAMP
);

-- Share access logs (optional, for analytics)
CREATE TABLE share_access (
  id UUID PRIMARY KEY,
  match_id UUID FOREIGN KEY,
  viewer_id VARCHAR(100), -- Anonymous or user ID
  joined_at TIMESTAMP,
  last_seen TIMESTAMP
);
```

#### 4.3 API Endpoints (If Custom Backend)
```
Authentication:
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token

Match Management:
POST   /api/matches/create
GET    /api/matches/:id
POST   /api/matches/:id/join (viewer)
POST   /api/matches/:id/leave

Scoring:
POST   /api/matches/:id/add-ball
POST   /api/matches/:id/undo-ball
POST   /api/matches/:id/complete

Real-time:
WebSocket: wss://backend.example.com/ws/:match_id/:token
Events: ball_added, wicket, match_completed, state_updated
```

---

### Phase 2: Frontend Architecture (Week 2-3)

#### 4.4 New Components

**`components/LiveShareModal.tsx`**
- Display match share code
- Copy to clipboard functionality
- Show viewer count
- QR code for mobile sharing

**`components/LiveScoreViewer.tsx`**
- Read-only scoreboard display
- Real-time score updates
- Commentary feed (ball-by-ball)
- Team stats display
- No editing capabilities

**`components/JoinLiveMatch.tsx`**
- Input share code or scan QR
- Join match as viewer
- Loading state during connection

**`components/RealtimeSync.ts`** (Utility)
- WebSocket connection management
- Reconnection logic
- State synchronization
- Error handling

#### 4.5 Modified Components

**`components/ScoringScreen.tsx`**
- [ ] Add "Share Live Score" button
- [ ] Integrate real-time sync on each ball entry
- [ ] Show viewer count badge
- [ ] Add offline fallback (queue balls, sync when online)

**`components/DashboardScreen.tsx`**
- [ ] Add "View Live" option for active matches
- [ ] Show share status indicator
- [ ] Display live viewer count

**`types.ts`**
- [ ] Add new interfaces:
  ```typescript
  interface LiveMatchSession {
    id: string;
    shareCode: string;
    scorerId: string;
    status: 'live' | 'completed' | 'paused';
    viewerCount: number;
  }

  interface RealtimeEvent {
    type: 'ball_added' | 'wicket' | 'state_update' | 'match_completed';
    matchId: string;
    payload: any;
    timestamp: number;
  }

  interface ViewerConnection {
    matchId: string;
    userId: string;
    connectedAt: number;
  }
  ```

#### 4.6 State Management Changes
- [ ] Add Redux/Zustand store for real-time updates
- [ ] Implement conflict resolution (scorer takes priority)
- [ ] Queue ball events during offline periods
- [ ] Sync on reconnect

---

### Phase 3: Real-Time Communication (Week 3-4)

#### 4.7 WebSocket Implementation

**Connection Flow:**
```typescript
// Scorer side
const socket = connectToLiveMatch(matchId, scorerToken);
socket.on('connect', () => setViewerCount(0));

// On ball added
addBall(ballData);
socket.emit('ball_added', ballData);
socket.on('ball_acknowledged', () => updateLocalState());

// Viewer side
const socket = connectToLiveMatch(matchId, shareCode);
socket.on('ball_added', (ballData) => updateLocalScore());
socket.on('match_completed', () => showCompletionScreen());
```

**Event Types:**
```
Scorer → Viewers:
- ball_added: New ball entered
- wicket: Wicket taken
- undo_ball: Ball reversed
- match_paused: Match paused
- match_resumed: Match resumed
- match_completed: Match finished

Viewers → Server:
- viewer_joined: New viewer connected
- viewer_left: Viewer disconnected
- ready_for_update: Client ready for next state
```

#### 4.8 Offline/Online Handling

**Offline Mode (Scorer):**
- [ ] Queue ball entries in IndexedDB
- [ ] Show offline indicator
- [ ] Auto-sync when online
- [ ] Handle conflicts (ask user which version to keep)

**Connection Quality:**
- [ ] Implement reconnection with exponential backoff
- [ ] Show connection status badge
- [ ] Buffer events during poor connection

---

### Phase 4: Security & Authentication (Week 4-5)

#### 4.9 Authentication
- [ ] JWT tokens for scorers
- [ ] Anonymous/guest tokens for viewers
- [ ] Share code encryption (6-digit code or longer)
- [ ] Token expiration: 12 hours for scorers, 2 hours for viewers

#### 4.10 Authorization
- [ ] Scorers can only modify their own matches
- [ ] Viewers are read-only
- [ ] Server-side validation on all API calls
- [ ] Rate limiting on API endpoints

#### 4.11 Data Privacy
- [ ] No PII in share codes
- [ ] Optional password protection for sensitive matches
- [ ] Viewer analytics (optional, with consent)
- [ ] Auto-delete old share sessions after 1 week

---

### Phase 5: Viewer Experience (Week 5-6)

#### 4.12 Viewer Interface

**Live Score Viewer Layout:**
```
┌─────────────────────────────────────┐
│ Team 1    vs    Team 2              │
│ [Runs] - [Wickets]                  │
├─────────────────────────────────────┤
│ Current Over: 5.3                   │
│ [Ball Details] [Last 3 Balls]       │
├─────────────────────────────────────┤
│ Commentary Feed:                    │
│ • 5.3 - Bowled, 1 run               │
│ • 5.2 - Four runs                   │
│ • 5.1 - Dot ball                    │
├─────────────────────────────────────┤
│ Team Stats | Batting Order | PSR    │
└─────────────────────────────────────┘
```

**Features:**
- [ ] Full scorecard display
- [ ] Running commentary
- [ ] Player statistics updates
- [ ] Predicted score (for T20/ODI)
- [ ] Share viewer link to team chat (WhatsApp, Telegram)

#### 4.13 Mobile Optimization
- [ ] Responsive design for phones
- [ ] PWA support for viewers (offline scorecard)
- [ ] QR code scanning for easy join
- [ ] Landscape mode for live viewing

---

### Phase 6: Testing & Deployment (Week 6-7)

#### 4.14 Testing Strategy

**Unit Tests:**
- [ ] Real-time sync logic
- [ ] State merge/conflict resolution
- [ ] Offline queue management
- [ ] Authentication token handling

**Integration Tests:**
- [ ] Scorer adds ball → Viewers receive update
- [ ] Multiple viewers connected simultaneously
- [ ] Network disconnection scenarios
- [ ] Reconnection and state sync

**E2E Tests:**
- [ ] Create match, share code, viewer joins
- [ ] Scorer adds 6 balls, viewer sees each ball
- [ ] Viewer disconnects/reconnects mid-match
- [ ] Match completion and final sync

**Load Testing:**
- [ ] 100+ viewers watching same match
- [ ] 10 scorers with 50 viewers each (platform level)
- [ ] WebSocket message throughput

#### 4.15 Deployment Plan

**Staging:**
- [ ] Deploy to staging environment
- [ ] Test with internal team (5-10 users)
- [ ] 1 week staging period
- [ ] Performance monitoring

**Production:**
- [ ] Blue-green deployment
- [ ] Monitor error rates first 24 hours
- [ ] Gradual rollout: 10% → 50% → 100%
- [ ] Have rollback plan ready

---

## 5. Technology Decision Matrix

| Factor | Firebase | Supabase | Custom Backend |
|--------|----------|----------|----------------|
| Setup Time | 1-2 days | 2-3 days | 1 week |
| Learning Curve | Easy | Medium | Medium-Hard |
| Cost @ 100k viewers/mo | ~$200-500 | ~$50-200 | ~$100-300 |
| Scalability | Auto | Manual | Manual |
| Customization | Limited | High | Full |
| Team Expertise | JavaScript | SQL + JS | Full Stack |
| **Recommended for MVP** | ✅ YES | Could work | Overkill now |

---

## 6. Implementation Phases Timeline

```
Week 1-2:  Backend setup + Database schema
Week 2-3:  Frontend components + State management
Week 3-4:  WebSocket implementation
Week 4-5:  Auth + Security
Week 5-6:  Viewer experience + Mobile
Week 6-7:  Testing + Staging + Production
```

**MVP Launch Target:** 7 weeks from start

---

## 7. MVP Scope (Minimum Viable Product)

**Include in MVP:**
- ✅ Scorer shares match with 6-digit code
- ✅ Viewers join with code, see live score
- ✅ Real-time ball updates (WebSocket)
- ✅ Scoreboard display (Team names, runs, wickets, overs)
- ✅ Basic commentary (over, runs, wicket type)
- ✅ Viewer count on scorer side

**Defer to v3.1:**
- ❌ Player statistics updates
- ❌ Predicted score calculations
- ❌ Replay functionality
- ❌ Chat/messaging between viewers
- ❌ Match recording/analytics
- ❌ Password-protected matches

---

## 8. Risk Assessment & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Real-time latency | High | Use Firebase (managed), monitor in staging |
| Viewer connection drop | High | Implement reconnection with exponential backoff |
| Scorer goes offline | Medium | Queue events, sync when back online |
| Share code collision | Low | Use longer codes or UUID-based |
| Scale beyond 100 viewers | Medium | Load test, use CDN for static content |
| Database costs spiral | Medium | Implement viewer limits, query optimization |

---

## 9. Success Metrics

**Technical:**
- [ ] Ball update latency < 500ms (P95)
- [ ] 99.5% availability during matches
- [ ] Support 100+ concurrent viewers
- [ ] Zero data loss during sync

**Business:**
- [ ] 80% of scorers use live feature
- [ ] Average 10+ viewers per live match
- [ ] <0.1% share code collision rate
- [ ] 95% user satisfaction

---

## 10. Code Structure Changes

### New Directory Structure
```
components/
├── ScoringScreen.tsx (modified)
├── DashboardScreen.tsx (modified)
├── LiveShareModal.tsx (new)
├── LiveScoreViewer.tsx (new)
├── JoinLiveMatch.tsx (new)
└── RealtimeSync.tsx (new)

services/ (new directory)
├── realtimeService.ts - WebSocket connection
├── apiService.ts - Backend API calls
├── syncService.ts - State sync logic
└── storageService.ts - LocalStorage + IndexedDB

hooks/ (new directory)
├── useRealtimeMatch.ts - Real-time match hook
├── useLiveViewer.ts - Viewer mode hook
└── useOfflineQueue.ts - Offline queue management

types.ts (modified)
└── Add: LiveMatchSession, RealtimeEvent, ViewerConnection interfaces
```

---

## 11. Next Steps

### When Ready to Start Development:
1. [ ] Finalize backend technology choice (recommend: Firebase for MVP)
2. [ ] Set up backend project and database schema
3. [ ] Create backend API endpoints (if not Firebase)
4. [ ] Design WebSocket message protocol
5. [ ] Create type definitions for all real-time events
6. [ ] Start with LiveScoreViewer component (read-only display)
7. [ ] Implement WebSocket connection in RealtimeSync
8. [ ] Modify ScoringScreen to emit real-time events
9. [ ] Add LiveShareModal to ScoringScreen
10. [ ] Create JoinLiveMatch flow for viewers
11. [ ] Test with 2-3 devices simultaneously
12. [ ] Add error handling and reconnection logic
13. [ ] Optimize for mobile viewers
14. [ ] Load test with multiple concurrent viewers
15. [ ] Deploy to staging for team testing

---

## 12. Questions for Team Discussion

1. **Budget:** Any limitations on backend costs?
2. **Authentication:** Should viewers need to create accounts or stay anonymous?
3. **Persistence:** Should match history include viewer engagement metrics?
4. **Notifications:** Push notifications when match starts/ends?
5. **Audience:** Will viewers be club members only or public streaming?
6. **Devices:** Prioritize mobile or desktop viewers first?

---

## References & Resources

- **Firebase Realtime Database:** https://firebase.google.com/docs/database
- **Socket.io:** https://socket.io/docs/
- **WebSocket API:** https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **Supabase Realtime:** https://supabase.com/docs/guides/realtime
- **React WebSocket Hooks:** https://github.com/useHooks/useWebSocket

---

**Document Status:** Ready for team review and implementation planning  
**Last Updated:** January 31, 2026  
**Next Review:** Before development begins
