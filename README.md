<div align="center">
  <img src="./public/ReplogIcon.png" alt="RepLog Logo" width="120" height="120" />
  <h1>RepLog</h1>
  <p><b>Quantified Hypertrophy. Zero Data Loss.</b></p>

  <p>
    <a href="#overview">Overview</a> •
    <a href="#architecture--technical-innovation">Architecture</a> •
    <a href="#core-features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a>
  </p>
</div>

---

## Overview

**RepLog** is a highly resilient, offline-capable, mobile-first workout tracking Progressive Web App (PWA) engineered to guarantee data integrity. It treats your training log as mission-critical data. Built with optimistic UI updates, robust background synchronization, and detailed performance analytics, it maps your volume and tracks progressive overload without interrupting your session.

---

## Architecture & Technical Innovation

> **Development Note:** RepLog was initially architected utilizing AI-assisted rapid prototyping to orchestrate a complex Next.js and Supabase full-stack environment. This project serves as an active learning roadmap, with future iterations planned to migrate computational heavy lifting to a dedicated Python backend and optimize core data structures using C.

### Solving the Mobile Browser Execution Trap
Mobile browsers aggressively pause or kill JavaScript execution when an app is backgrounded (e.g., swiping away, checking another app). Traditional debounced API calls fail in this environment, leading to lost workout data. 

RepLog solves this by maintaining a global registry of pending field saves alongside a local "Shadow Database" using IndexedDB (via Dexie). If the `visibilitychange` or `beforeunload` APIs detect the app hiding, the unmount lifecycle instantly cancels the debounce timer, flushes all pending inputs to the local cache, and forces the server write. This ensures absolute data integrity regardless of network drops or OS-level app suspensions.

---

## Core Features

*   **Zero Data-Loss Architecture:** Every keystroke (weight, reps, RPE, RIR) is captured in local React state immediately and synced to IndexedDB.
*   **Fully Optimistic UI:** The interface never blocks for a loading spinner. Logging a set or modifying data happens instantly on screen, while server actions fire silently in the background with exponential backoff and retry logic.
*   **Silent State Reconciliation:** A background polling loop (every 60 seconds) fetches the true server state and intelligently merges it with the active local state using a custom `_clientId` mapping system. Database IDs upgrade in the background without unmounting components or interrupting active typing.
*   **Comprehensive Analytics:** 
    *   Interactive 7-day volume distribution charts.
    *   Muscle engagement progress bars.
    *   Automatic Personal Record (PR) tracking.
    *   Key metrics calculation: Weekly Volume, Frequency, Average RIR, and Intensity Score.
*   **Progressive Web App (PWA):** Fully installable on iOS and Android devices directly from the browser, functioning identically to a native application.
*   **Extensive Customization:** Built-in Light and Dark modes, dynamic accent colors, and toggleable tracking fields (RIR/RPE) to match specific training styles.

---

## Database Schema & Data Flow

The application relies on a strictly typed Prisma schema to manage relational workout data:

*   **User:** Handled via NextAuth for secure authentication.
*   **WorkoutSession:** Represents a single gym visit, tracking active status.
*   **WorkoutLog:** Acts as an "exercise slot" within a session, linking to a specific Exercise and maintaining chronological order.
*   **SetLog:** The individual sets inside a WorkoutLog. Tracks set number, weight, reps, RPE, RIR, and completion status.
*   **Exercise:** The master library of movements, categorizing primary muscles, secondary muscles, and mechanics (Compound vs. Isolation).

---

## Tech Stack

*   **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
*   **UI/Components:** [React 18](https://react.dev/)
*   **Database:** [PostgreSQL](https://www.postgresql.org/) (Hosted on [Supabase](https://supabase.com/))
*   **ORM:** [Prisma](https://www.prisma.io/)
*   **Authentication:** [NextAuth.js](https://next-auth.js.org/) with Prisma Adapter
*   **Offline Storage & Caching:** [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
*   **PWA Support:** `@ducanh2912/next-pwa`
*   **Icons:** [Lucide React](https://lucide.dev/)

---

## Getting Started

Follow these steps to run the local development environment.

### Prerequisites
*   Node.js 18.x or higher
*   PostgreSQL Database
*   Google Cloud Console account (for NextAuth OAuth credentials)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/aryannair767/replog.git
cd replog
```

**2. Install dependencies**
```bash
npm install
```

**3. Environment Variables**
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
cp .env.example .env.local
```
*   `DATABASE_URL` / `DIRECT_URL`: PostgreSQL connection strings.
*   `NEXTAUTH_SECRET`: Generate using `openssl rand -base64 32`.
*   `NEXTAUTH_URL`: `http://localhost:3000`
*   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth credentials.

**4. Database Setup**
```bash
npm run db:push
```

**5. Start Development Server**
```bash
npm run dev
```

---

## Author

**Aryan Nair**
*   LinkedIn: [Aryan Nair](https://www.linkedin.com/in/aryannair767/)
*   GitHub: [@aryannair767](https://github.com/aryannair767)
