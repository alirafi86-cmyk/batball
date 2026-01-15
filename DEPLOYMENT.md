# Batball Deployment Guide

## Quick Start - Deploy to Vercel (Recommended)

### Step 1: Prepare Your Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Batball v1.0.0"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/batball.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel

1. **Sign up** at [vercel.com](https://vercel.com)
2. **Click "New Project"**
3. **Import** your GitHub repository
4. **Configure Project:**
   - Framework: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add `API_KEY` = Your Google Gemini API Key
   - (Get one from [Google AI Studio](https://aistudio.google.com/app/apikey))

6. **Click Deploy** - Your app will be live in ~2 minutes!

### Step 3: Get Your Custom Domain (Optional)

In Vercel dashboard:
- Go to "Settings" → "Domains"
- Add custom domain (e.g., `our-club-scoring.vercel.app`)
- Share with your club!

---

## Alternative: Deploy to Netlify

### Step 1-2: Same as Vercel

```bash
git init
git add .
git commit -m "Initial commit"
git push -u origin main
```

### Step 3: Netlify Deploy

1. **Sign up** at [netlify.com](https://netlify.com)
2. **Click "Add new site"** → **"Import an existing project"**
3. **Connect GitHub** and select your `batball` repo
4. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Add environment variables** (Site settings):
   - `API_KEY` = Your Google Gemini API Key
6. **Deploy site**

---

## Features Enabled for Production

✅ **Progressive Web App (PWA)** - Users can install the app on their home screen  
✅ **Service Workers** - Full offline support, caching strategy  
✅ **Error Boundaries** - Graceful error handling  
✅ **Code Splitting** - Optimized bundle loading  
✅ **Data Export** - JSON & CSV backup functionality  
✅ **Manifest.json** - App metadata and branding  

---

## Local Testing Before Deploy

```bash
# Build locally
npm run build

# Preview production build
npm run preview

# Open browser to http://localhost:4173
```

---

## Setting Up Your Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Select your Google Cloud project (or create new one)
4. Copy the API key
5. Paste in Vercel/Netlify environment variables as `API_KEY`

**Important:** Keep this key SECRET. Never commit it to GitHub.

---

## Club Usage Guide

### For Your Club Members:

**🌐 Visit:** `https://your-club-scoring.vercel.app`

**📱 Install App (on their phones):**
- **iOS:** Tap Share → Add to Home Screen
- **Android:** Menu → Install App

**🏏 First Time Setup:**
- Admin PIN: `1234` (change this!)
- Create match with team names & players
- Set unique scorer PIN for that match
- Scorer can now track every ball

**📤 Post Results:**
- After match, click "Post to Club Group"
- Sends JSON scorecard to WhatsApp group
- Anyone can download file and view full stats

**💾 Backup:**
- Dashboard → Export as JSON/CSV regularly
- Keep copies of important matches

---

## Troubleshooting

**Q: API_KEY not working?**  
A: Check that you've set it in environment variables. Vercel/Netlify must be redeployed after adding env vars.

**Q: Data disappeared after browser refresh?**  
A: Check browser DevTools → Application → Local Storage. Service worker should cache it.

**Q: Want to change admin PIN?**  
A: Edit `const MASTER_CLUB_PIN = '1234'` in `App.tsx`, rebuild, and redeploy.

---

## Next Steps

- [ ] Update `package.json` repository URL with your GitHub URL
- [ ] Create `.env` file locally: `API_KEY=your_key_here`
- [ ] Test locally: `npm run dev`
- [ ] Push to GitHub
- [ ] Deploy to Vercel/Netlify
- [ ] Test on mobile device
- [ ] Share URL with club members
- [ ] Regular backups of match data

---

## Support

For issues or feature requests, please create an issue on GitHub or contact the development team.

**Go Batball! 🏏** 

