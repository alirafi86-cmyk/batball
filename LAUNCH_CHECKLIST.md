# Batball - Pre-Launch Checklist

## ✅ Code Quality & Features

- [x] PWA support (manifest + service worker)
- [x] Error boundary for graceful error handling
- [x] Bundle optimization with code splitting
- [x] Data export functionality (JSON & CSV)
- [x] Offline-first architecture
- [x] Mobile-responsive UI
- [x] Admin PIN security
- [x] Match-specific scorer PIN

## 🔧 Setup Before Going Live

- [ ] Update GitHub repository URL in `package.json`
- [ ] Change admin PIN from `1234` to something secure
- [ ] Get Google Gemini API key from https://aistudio.google.com/app/apikey
- [ ] Choose deployment platform (Vercel recommended)
- [ ] Set up custom domain (optional but recommended)

## 📋 GitHub Setup

```bash
# Create new repository on GitHub
# Then locally:
git init
git add .
git commit -m "Initial commit: Batball Cricket Scorer"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/batball.git
git push -u origin main
```

## 🚀 Deploy to Vercel (Recommended)

1. **Sign up** at https://vercel.com
2. **Import project** from GitHub
3. **Configure:**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output: `dist`
4. **Environment Variables:**
   - `API_KEY` = Your Gemini API key
5. **Deploy** - Done! Share the URL with your club

## 🧪 Pre-Launch Testing

- [ ] Test on desktop (Chrome, Safari, Firefox)
- [ ] Test on iOS (Safari)
- [ ] Test on Android (Chrome)
- [ ] Install as PWA on mobile
- [ ] Test offline mode (disable internet)
- [ ] Create a test match end-to-end
- [ ] Export data (JSON & CSV)
- [ ] Test error boundary (open DevTools Console, find an error state)
- [ ] Verify service worker installed (DevTools > Application > Service Workers)

## 📱 Club Member Setup Instructions

Send this to your club members:

```
Welcome to Batball Scorer! 🏏

📱 INSTALL ON YOUR PHONE:
- Visit: [your-vercel-url]
- iOS: Tap Share → Add to Home Screen
- Android: Menu → Install App

🏆 GETTING STARTED:
1. First time? Admin needs to set up the match (PIN: 1234)
2. Create both teams and add player names
3. Set a unique Scorer PIN
4. Share PIN with the person scoring that match
5. Scorer logs in and tracks every ball
6. Post to WhatsApp group when match ends!

❓ Questions? Contact the admin.
```

## 🔐 Security Reminders

- **NEVER commit API key** to GitHub - only use environment variables
- **Change default admin PIN** (currently 1234)
- **Keep Gemini API key secret** - treat like a password
- **Regular backups** - Download JSON exports monthly
- **Monitor rate limits** - Gemini has usage limits on free tier

## 📊 Monitoring After Launch

- Check build status weekly in Vercel dashboard
- Monitor error logs (Vercel dashboard → Logs)
- Get feedback from club members on usability
- Plan features for v2 based on usage

## 🎯 Optional Enhancements for Future

- [ ] Add live match notifications
- [ ] Player photo uploads
- [ ] Tournament mode
- [ ] Cloud backup (Firebase/Supabase)
- [ ] League standings
- [ ] Match statistics dashboard
- [ ] Push notifications
- [ ] Dark mode

---

## 📞 Support & Troubleshooting

**Build fails?** 
- Run: `npm install` then `npm run build`

**Service worker not caching?**
- Clear browser cache
- Restart browser
- Check DevTools > Application > Service Workers

**API key not working?**
- Verify key in Vercel environment variables
- Redeploy after adding variable
- Check Google Cloud quota limits

**Need help?**
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions
- Review error messages in Vercel logs

---

## 🎉 Launch Checklist Summary

```
Before you go live, confirm:
✓ Code builds successfully locally
✓ No console errors in browser
✓ PWA installs on mobile
✓ Offline mode works
✓ GitHub repo is set up
✓ Vercel/Netlify deployed
✓ Environment variables configured
✓ Domain working (if custom)
✓ Data export working
✓ Error boundary tested
✓ Club members have instructions
```

**You're ready to launch!** 🚀

