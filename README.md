# 🎓 SVIT Attend Hub

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E.svg)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-Styling-38B2AC.svg)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-ff69b4.svg)](https://web.dev/progressive-web-apps/)

**SVIT Attend Hub** is an enterprise-grade College Management System (ERP) and Attendance Hub built for **Sardar Vallabhbhai Patel Institute of Technology (SVIT)**, Vasad. It streamlines real-time attendance tracking, academic coordination, library transactions, and student risk analytics through a responsive, mobile-first Progressive Web Application.

- **Production URL**: [https://svit-attend-hub.vercel.app](https://svit-attend-hub.vercel.app)
- **Institution**: Sardar Vallabhbhai Patel Institute of Technology, Vasad, Gujarat

---

## ✨ Features & Architecture

### 🏢 Multi-Role Portals
- **Admin Dashboard**: System administration, course management, student & faculty registration, and institutional risk metrics.
- **Faculty / Teacher Portal**: Daily attendance marking, QR-code session generation, homework assignment, and performance monitoring.
- **Student Portal**: Dynamic QR attendance verification, attendance records, exam results, and timetable viewer.
- **Parent Portal**: Direct child attendance monitoring, academic performance tracking, and institutional notifications.
- **Librarian Suite**: Rapid book issuing and returns with embedded QR scanning (`html5-qrcode`).

### 📱 Progressive Web App (PWA)
- Fully installable on Android, iOS, and Desktop.
- Offline precaching for instant loading via Service Workers.
- Standalone display mode with custom icons and app shortcuts.

### ⚡ Performance & Optimization
- **Code-Splitting**: Three.js, PDF generation, charting, and QR scanner engines isolated into asynchronous vendor chunks.
- **Production Hardened**: Zero dev-builder tags, disabled production source maps, strict type checking, and zero ESLint errors.
- **Dual-Key Resilient**: Automatic support for both `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

---

## 🛠️ Tech Stack

- **Frontend**: [React 18](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Vite 5](https://vitejs.dev/)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Row Level Security, Edge Functions)
- **State & Data Fetching**: [TanStack React Query](https://tanstack.com/query)
- **Charts & Visuals**: [Recharts](https://recharts.org/), [Three.js](https://threejs.org/)
- **Scanner & Documents**: [html5-qrcode](https://github.com/mebjas/html5-qrcode), [jsPDF](https://github.com/parallax/jsPDF), [PapaParse](https://www.papaparse.com/)

---

## 📁 Project Structure

```text
svit-attend-hub/
├── public/                 # Static assets, PWA icons, sitemap, robots, llms.txt
│   ├── svit-favicon.jpg
│   ├── svit-logo-official.jpg
│   ├── sitemap.xml
│   ├── robots.txt
│   └── llms.txt
├── src/
│   ├── assets/             # Institutional logos and images
│   ├── components/
│   │   ├── auth/           # Login and authentication dialogs
│   │   ├── dashboard/      # Role-specific dashboard widgets
│   │   ├── layout/         # Navigation, TopTabs, AppSidebar, Breadcrumbs
│   │   └── ui/             # Shadcn reusable UI components
│   ├── hooks/              # Custom React hooks (useUserRole, etc.)
│   ├── integrations/
│   │   └── supabase/       # Hardened Supabase client and typed schemas
│   ├── lib/                # Utility helpers
│   ├── pages/              # Route pages (Attendance, Timetable, Risk, etc.)
│   ├── App.tsx             # Root routing with code-split routes
│   └── main.tsx            # Application entry point
├── supabase/
│   ├── config.toml         # Supabase project configuration
│   └── functions/          # Deno Edge Functions
├── .env.example            # Documented environment variables template
├── package.json            # Scripts and dependencies
├── tailwind.config.ts      # Tailwind styling configuration
└── vite.config.ts          # Vite build, chunking, and PWA configuration
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher)

### 1. Clone the repository
```bash
git clone https://github.com/nishant020208/svit-attend-hub.git
cd svit-attend-hub
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🧪 Verification & Build

```bash
# Type check and lint
npm run lint

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Deployment

### Deploying on Vercel
1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Framework Preset to **Vite**.
4. Add Environment Variables:
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
5. Deploy.

---

## 👨‍💻 Author

Developed and maintained by **[Nishant Shah](https://github.com/nishant020208)**.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
