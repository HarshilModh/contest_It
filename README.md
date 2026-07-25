# Contest It ⚖️

> **Civic AI Console for NYC OATH Summons Defense & Empirical Dismissal Odds**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?style=flat-square&logo=google)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📌 Problem Overview

Every year, New York City issues over **400,000+ administrative summonses** across agencies like the Department of Sanitation (**DSNY**), Department of Environmental Protection (**DEP**), Department of Buildings (**DOB**), and Department of Health (**DOHMH**). 

The vast majority of citizens, homeowners, and small business owners either **pay fines unnecessarily** or suffer default penalties simply because:
1. They don't know their **empirical dismissal odds** based on historical hearing verdicts.
2. They don't know how to structure a formal, legally grounded **defense statement** tailored for NYC OATH (Office of Administrative Trials and Hearings) officers.

---

## 💡 The Solution: Contest It

**Contest It** bridges the gap between public open data and citizen action. By combining **Google Gemini AI Multimodal Vision OCR** with a pre-indexed dataset of **421,390+ public NYC OATH hearing decisions**, Contest It empowers users to:

1. **Scan Tickets Instantly**: Upload a photo of an NYC summons or speak/type a violation charge code (e.g. `16-118(2)` for Sidewalk Snow/Ice).
2. **Calculate Real Dismissal Odds**: Instantly cross-reference exact charge codes against historical NYC hearing verdicts to reveal dismissal probability percentages, average penalties, and case outcome distributions.
3. **Generate Formal Defense Briefs**: Receive a custom, structured legal defense statement citing applicable NYC Administrative Codes and procedural defenses ready to submit online or present at a hearing.

---

## ✨ Key Features

- 📸 **Ticket OCR Scanner Viewfinder**: Drag-and-drop or upload photo tickets (JPG, PNG, HEIC) with animated laser OCR scanning powered by Gemini Vision.
- 🎙️ **Voice Search Console**: Speak violation details using integrated browser Web Speech API.
- 📊 **Empirical OATH Analytics Engine**: Precomputed statistical analysis over 420,000+ public NYC hearing records providing:
  - SVG Radial Probability Ring Gauges
  - Historical Case Outcome Distribution (Dismissed, In Violation, Settled, Other)
  - Average & Median Imposed Penalty Benchmarks ($)
- 📝 **Formal Defense Statement Synthesis**: AI-generated defense briefs formatted specifically for NYC OATH Hearing Officers.
- 💾 **Export & Print**: One-click download as `.txt` or print-formatted legal defense briefs.
- 🎨 **Ultra-Modern Glassmorphic UI**:
  - Dual Theme Support (Vibrant Light Mode by default & Electric Obsidian Dark Mode).
  - Interactive Constellation Particle Canvas background with mouse reactivity.
  - Animated 3D perspective grid & ambient aurora atmosphere.
  - Color-coded agency badges (DSNY Green, DEP Cyan, DOB Amber, DOHMH Pink).
  - 100% responsive layout across mobile, tablet, and desktop viewports.

---

## 🛠️ Tech Stack & Architecture

### Core Technologies
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI & Logic**: [React 19](https://react.dev/), TypeScript
- **Styling**: Vanilla CSS Design Tokens, Glassmorphic Utility Classes, Tailwind CSS v4
- **AI Engine**: [Google Gemini API (`@google/genai`)](https://www.npmjs.com/package/@google/genai) — `gemini-2.5-flash`
- **Data Source**: NYC Open Data — NYC OATH Hearing Decisions Dataset (421,390+ records)

### Project Directory Structure

```
contest_it/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts          # Gemini Vision OCR & OATH Data Fusion API
│   ├── icon.svg                  # Brand SVG Vector Favicon
│   ├── globals.css               # Dual Themes, Glassmorphism & Backgrounds
│   ├── layout.tsx                # Root Layout, Metadata & Theme Hydration
│   └── page.tsx                  # Main Workspace Console
├── components/
│   ├── BackgroundAtmosphere.tsx  # Interactive 60fps Particle Constellation
│   ├── HeroSection.tsx           # Ticket Scanner Viewfinder & Voice Search
│   ├── StatsAndFaq.tsx           # Agency Benchmarks, Metrics & Workflow
│   ├── ThemeToggle.tsx           # Light/Dark Theme Switcher Button
│   └── VoiceInput.tsx            # Speech-to-Text Voice Microphone Button
├── lib/
│   ├── gemini.ts                 # Gemini Vision OCR & Defense Synthesis Logic
│   ├── oath.ts                   # OATH Dataset Query & Odds Calculator
│   ├── oath-cache.json           # Precomputed Index of 421,390+ OATH Cases
│   └── types.ts                  # Shared TypeScript Interfaces
└── public/                       # Static Assets & Mocks
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.17.0` or higher
- **npm** or **yarn** or **pnpm**
- **Google Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/contest_it.git
   cd contest_it
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to launch the console.

5. **Build for Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📊 Sample Violation Codes to Test

Try searching or clicking these preset NYC violation codes:
- `16-118(2)` — **DSNY**: Sidewalk Snow / Ice Removal
- `24-244` — **DEP**: Unreasonable Noise Violation
- `28-301.1` — **DOB**: Failure to Maintain Building Exterior
- `81.07` — **DOHMH**: Food Service Sanitation / Signage

---

## ⚖️ Disclaimer

*Contest It is a civic technology demonstration tool built for analytical and informational purposes. Dismissal probabilities and penalty estimates are calculated from historical public records of completed NYC OATH hearings. Contest It does not provide formal legal representation or attorney advice.*

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
