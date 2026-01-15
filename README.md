
# 🏏 Batball Scorer
### Professional Cricket Scoring & Archive for Local Clubs

Batball is a high-performance web application designed for local clubs to track matches, manage player stats, and archive results without needing expensive servers or complex databases.

---

## ☁️ The "WhatsApp Cloud" Strategy
Local clubs don't need expensive databases. Batball uses **WhatsApp as your free, unlimited archive**:

1.  **Scoring**: The match is scored locally on the scorer's phone (works offline).
2.  **Finishing**: When the match ends, click **"Post to Club Group"**.
3.  **Storage**: This sends a tiny `.json` "Scorecard File" to your WhatsApp group. WhatsApp now hosts this data forever for free.
4.  **Viewing**: Any club member can download that file from WhatsApp, open this app, and click **"Open Shared Scorecard"** to see the full professional Cricinfo-style summary.
5.  **Offloading**: Once the file is on WhatsApp, the scorer can **"Purge"** the match from their phone to keep it fast.

---

## 🚀 Deployment (Vercel/Netlify)
1.  **GitHub**: Push this project to a repository.
2.  **Deploy**: Connect to Vercel/Netlify.
3.  **Environment Variable**: Add `API_KEY` (Your Google Gemini API Key).
4.  **Live**: Your club now has a dedicated scoring URL (e.g., `our-club-scoring.vercel.app`).

---

## 🛠 Features
*   **AI Match Reports**: Gemini AI writes exciting WhatsApp-ready recaps.
*   **Club Hub**: Track team standings and player career stats across all local matches.
*   **Stadium Mode**: Use the **Billboard View** on a TV or Laptop at the ground for a live digital scoreboard.
*   **Local-First**: Every ball is saved instantly to the phone. Even if the browser crashes, the score is safe.

---

## 🔒 Security
*   **Club Admin PIN (`1234`)**: Required to start new matches.
*   **Match PIN**: Set by the admin so a specific player/volunteer can score that specific game.

---

Developed for the local cricket community. 🏏
