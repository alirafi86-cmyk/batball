
# 🏏 Batball Scorer
### Professional Cricket Scoring for Local Clubs

Batball is a high-performance web application for local cricket clubs to score matches, track player stats, and share results instantly - **completely offline-first**.

**Live at:** https://batball-three.vercel.app

---

## ✨ Key Features

- ✅ **Ball-by-Ball Scoring** - Live tracking with instant saves
- ✅ **Smart Extras** - Wide/No-ball with automatic run calculations
- ✅ **Runout Handling** - 3-step modal for smooth runout flow
- ✅ **Team Management** - Save & reuse squads, edit names anytime
- ✅ **Player Statistics** - Auto-calculated from match history
- ✅ **Match History** - Complete scorecard archive with edit/delete
- ✅ **Offline Capable** - Full functionality without internet
- ✅ **Privacy First** - All data stored locally, zero cloud

---

## 🚀 Quick Start

### 1. Start a Match (2 minutes)
- Visit [Batball Scorer](https://batball-three.vercel.app)
- Click **New Match**
- Enter team names and select players
- Click **START MATCH**

### 2. Score Live (1+ hours)
- Select striker/bowler (auto-selected first time)
- Click run buttons: 0, 1, 2, 3, 4, 6
- Toggle **Wide/No-Ball** before clicking runs for extras
- Click **Wicket** to record dismissals
- Click **Undo** to reverse last ball

### 3. Manage (anytime)
- Click **Overs** to edit team names or match settings
- Click **Squad** to change players mid-match
- Delete with confirmation to prevent accidents

### 4. View Results (after match)
- View scorecard and player stats
- Edit team names to correct historical data
- Download and share as PNG image

---

## 🔧 Technical Stack

- **Frontend**: React 19 + TypeScript
- **Build**: Vite 6.4.1
- **Styling**: Tailwind CSS
- **Storage**: localStorage (offline-first, no backend)
- **Icons**: Font Awesome 6
- **Deployment**: Vercel

---

## 📋 Scoring Rules

- **Overs**: Configurable (T20 = 20, 50-over = 50)
- **Extras**: Wides and No-Balls = +1 run + free ball
- **Wickets**: All types (Bowled, Caught, LBW, Run-out, Stumped, Retired)
- **Retirement**: Player marked as retired, can resume later
- **Run-out**: 3-step flow (select who out → new batter → assign end)

---

## 📱 Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Requirements**: Node.js 16+, npm or yarn

---

## 🛠️ For Developers

See [ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md](ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md) for:
- Complete data model and architecture
- Component structure and key functions
- How to add new features
- Common issues and solutions
- Testing checklist before deployment

---

## 💾 Data Storage

All data saved to **browser localStorage** (no internet required):
- `active_match_state` - Current match in progress
- `active_match_settings` - Current match configuration
- `match_registry` - List of live matches
- `cricket_history` - Completed match archive

**Complete privacy** - nothing leaves your device.

---

## 🎯 Supported Cricket Formats

- ✅ T20 (20 overs)
- ✅ 50-over cricket
- ✅ Custom overs format
- ✅ Any number of players per team

---

## 🐛 Current Features

✅ **Working**:
- Offline scoring with persistence
- All cricket wicket types
- Wide and no-ball extras
- Multi-step runout handling
- Team name editing (during and post-match)
- Match history with delete confirmation
- Over counter (current over only)
- Extras display with correct labels (WD, NB)

🚀 **Future**:
- Live multiplayer mode
- Cloud backup option
- Advanced analytics (economy, strike rate)
- Mobile app (React Native)
- Commentary feature
- Season leaderboards

---

## 📄 License

Open source. Free to use for local cricket clubs.

---

**Made with ❤️ for cricket** 🏏