<div align="center">
  <img src="./public/ReplogIcon.png" alt="RepLog Logo" width="120" height="120" />
  <h1>RepLog</h1>
  <p><b>Quantified Hypertrophy. Build Muscle By The Numbers.</b></p>

  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a>
  </p>
</div>

---

## 🏋️‍♂️ What is RepLog?

**RepLog** is a precision lifting ledger designed for high-performance athletes who treat their training as biological engineering. Stop guessing and start tracking. RepLog maps your volume, tracks progressive overload, measures Reps in Reserve (RIR), and guarantees your next PR through meticulous data visualization. 

We’ve eliminated the noise so you can quantify your progress and force growth.

---

## ✨ Key Features

- **📊 Deep Hypertrophy Insights**: Track weekly volume distribution, muscle group engagement, and RIR breakdown with surgical precision.
- **📈 Progressive Overload Engine**: Visualize your strength compounding over time. Track 1RM trends, volume ceilings, and lift histories with dynamic graphs.
- **⚡ Pessimistic UI & Transactional Guards**: Lightning-fast, flick-free inputs using optimistic rendering combined with strict transactional guards to guarantee zero data loss during high-speed logging.
- **☁️ Real-time Cloud Sync**: Multi-device performance logging powered by Supabase. Zero compromise on data availability when you hit the platform.
- **🦾 Custom Exercise Vault**: Build a personal library of movements. Categorize them perfectly with custom muscle group classifications (Upper/Lower body routing).
- **🔒 Seamless Authentication**: Instant Google OAuth integration via NextAuth.js.

---

## 💻 Tech Stack

RepLog is built with a modern, scalable, and type-safe architecture:

* **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
* **Language**: [TypeScript](https://www.typescriptlang.org/)
* **Database**: [PostgreSQL](https://www.postgresql.org/) (Hosted on [Supabase](https://supabase.com/))
* **ORM**: [Prisma](https://www.prisma.io/)
* **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Google Provider)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Animations**: [Framer Motion](https://www.framer.com/motion/)
* **Client Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper for rapid client-side caching)
* **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

---

## 🏗️ Architecture Highlights

### Pessimistic UI Architecture
Logging a set shouldn't block you from your workout. RepLog implements a sophisticated "Pessimistic UI" layer. When you log a set, the UI instantly updates (optimistic feedback), while a transactional guard ensures the database successfully writes the data in the background. It employs debouncing and transition-based states to prevent layout shifts or input flickering when typing rapidly.

### Edge-Ready Database Polling
Utilizing Prisma with direct database connections specifically configured to handle connection pooling via Supabase/PgBouncer, ensuring rapid read/writes during intense multi-user volume bursts.

---

## 🚀 Getting Started

Follow these steps to run RepLog locally.

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL Database (A free Supabase project works perfectly)
- Google Cloud Console account (for NextAuth OAuth credentials)

### 1. Clone the repository
```bash
git clone https://github.com/aryannair767/replog-v2.git
cd replog-v2
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Environment Variables
Copy the `.env.example` file to `.env.local` and fill in your credentials.
```bash
cp .env.example .env.local
```

**Required Variables:**
- `DATABASE_URL`: Your pooled PostgreSQL connection string.
- `DIRECT_URL`: Your direct PostgreSQL connection string (for Prisma).
- `NEXTAUTH_SECRET`: Generate one using `openssl rand -base64 32`.
- `NEXTAUTH_URL`: `http://localhost:3000`
- `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.

### 4. Setup Database
Push the Prisma schema to your database.
```bash
npm run db:push
```

### 5. Start the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to see the application running.

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features or find a bug, please open an issue or submit a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👨‍💻 Author

**Aryan Nair**
- LinkedIn: [Aryan Nair](https://www.linkedin.com/in/aryannair767/)
- GitHub: [@aryannair767](https://github.com/aryannair767)

---

<div align="center">
  <i>Eliminate the Noise. Quantify your Progress. Force the Growth.</i>
</div>
