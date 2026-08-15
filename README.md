# 🛡️ SafeSig (SafeSignal AI)

> **Smart Navigation. Threat Detection. Safe Travel.**

**SafeSig (SafeSignal AI)** is an intelligent, secure navigation and network risk mapping system designed to keep users safe both physically and digitally. The application combines real-time physical crime risk mapping, cyber threat scanning (unauthorized Wi-Fi access points, phishing links, Bluetooth monitoring), live emergency alerts, dual-route comparison, and instant SOS emergency services.

---

## 🏗️ Architecture & Monorepo Structure

SafeSig is organized as a `pnpm` workspace monorepo. Applications and services live in `artifacts/`, while shared libraries and configurations live in `lib/`.

```
Safe-Sig/
├── artifacts/
│   ├── safesignal-ai/    # 📱 Mobile & Web App (React Native / Expo / Expo Router)
│   ├── api-server/       # ⚙️ Backend API Server (Express 5 / Node.js / Pino)
│   └── mockup-sandbox/   # 🎨 UI Mockup & Sandbox (Vite 7 / React 19 / Tailwind v4)
├── lib/
│   ├── db/               # 🗄️ Database integration (PostgreSQL + Drizzle ORM)
│   ├── api-spec/         # 📑 OpenAPI 3.1 Specification & Orval Codegen Config
│   ├── api-zod/          # 🛡️ Generated Zod Validation Schemas
│   └── api-client-react/ # ⚛️ Generated React Query API Client Hooks
├── attached_assets/      # 📌 Specification prompt and assets
├── scripts/              # 🛠️ Workspace post-merge and helper scripts
├── package.json          # Root package configuration
├── pnpm-workspace.yaml   # Workspace definition & catalog dependencies
└── replit.md             # Developer environment reference guide
```

---

## 🔍 Detailed Component Analysis

### 1. 📱 SafeSignal AI Mobile & Web App (`artifacts/safesignal-ai`)
The core user interface is built using **React Native**, **Expo (v54)**, **Expo Router**, and `@tanstack/react-query`. It provides a responsive, mobile-first experience (optimized for 390px viewport) that also runs seamlessly in web browsers via `react-native-web`.

#### **App Screens & Capabilities**
1. **Splash Screen**: White branded onboarding screen with app icon, tagline, and quick navigation button.
2. **Home Dashboard**:
   - Dynamic safety banner ("✅ You are in a Safe Zone" / "⚠️ High Risk Zone Detected").
   - 3 key stats: Crime Risk (High/Medium/Low), Cyber Threats count, and Network safety status.
   - Quick action bar: Route Planner, Threat Scanner, Live Alerts, and Profile.
   - Real-time recent security alert feed.
   - Sticky bottom red **🆘 SOS EMERGENCY** button.
3. **Route Planner**:
   - Location inputs (Origin & Destination).
   - Map placeholder integration card (`🗺️ Map Integration Coming Soon`).
   - Side-by-side route comparison:
     - **Recommended Safe Route**: Low crime rate, safe network zones, hazard-free.
     - **Fastest High-Risk Route**: Shorter duration with highlighted risk tags (High crime, accident zone, unsafe Wi-Fi).
4. **Threat Scanner**:
   - Real-time threat monitoring toggle switch.
   - **Wi-Fi Scanner**: Rogue/Evil Twin Wi-Fi hotspot detection.
   - **Bluetooth Monitor**: Unrecognized nearby device scanning.
   - **Phishing Detector**: URL/QR link validation tool.
   - Active threat list with severity badges.
5. **Live Alerts**:
   - Categorized security feed with filter tabs: **All**, **Physical**, and **Cyber**.
   - Distance badges, timestamps, and alert severity indicators.
6. **SOS Emergency**:
   - Pulsing animated SOS trigger button.
   - Live location sharing action.
   - Emergency contact dialer (Sister, Father).
   - Direct emergency services quick-call directory (Police Station, Hospital, Fire Station).
7. **Profile & Settings**:
   - User profile info (Sukesh M - 24CS0949 | CSE Dept).
   - Toggles for Push Notifications, Background Location, Auto Threat Scan, Night Mode, and SOS Auto-Call.
   - Emergency contact editor modal.

---

### 2. ⚙️ Backend API Server (`artifacts/api-server`)
- **Framework**: Express 5 on Node.js bundled with `esbuild`.
- **Logging**: High-performance HTTP request/response logging using `pino` and `pino-http`.
- **Middleware**: Configured with CORS enabled, JSON body parser, URL encoding, and cookie parser.
- **Endpoints**: Standard `/api` namespace, including `/api/healthz` health check endpoint.

---

### 3. 🎨 UI Mockup Sandbox (`artifacts/mockup-sandbox`)
- **Framework**: Vite 7 + React 19 + TailwindCSS v4.
- **UI Components**: Built using Radix UI primitives (`@radix-ui/react-*`), Lucide icons (`lucide-react`), Framer Motion, and shadcn-style component utilities.
- **Purpose**: Rapid web UI prototyping, component testing, and standalone UI design sandbox.

---

### 4. 🗄️ Shared Libraries (`lib/`)
- **`lib/db`**: Database connectivity using **Drizzle ORM** targeting PostgreSQL. Includes `drizzle-zod` for automatic Zod schema generation from database tables.
- **`lib/api-spec`**: Central OpenAPI 3.1 contract (`openapi.yaml`). Runs **Orval** code generation to sync backend API contracts directly into frontend hooks and validation schemas.
- **`lib/api-zod`**: Auto-generated Zod types and runtime validators derived from OpenAPI specs.
- **`lib/api-client-react`**: Auto-generated TanStack React Query custom fetch client derived from OpenAPI specs.

---

## ⚡ How to Run the Project

### Prerequisites
- **Node.js**: v20 or higher (Node.js 24 recommended)
- **pnpm**: v9+ package manager installed globally (or run using `npx pnpm`)

### 1. Install Dependencies
```bash
pnpm install
```
*(If `pnpm` is not globally installed on your system, use `npx pnpm install`)*

---

### 2. Run Applications

#### 📱 Run SafeSignal AI Mobile / Web App
```bash
pnpm --filter @workspace/safesignal-ai dev
```
- Starts the Expo development server.
- Press `w` in the terminal to open the web view in your browser.

#### ⚙️ Run Backend API Server
```bash
pnpm --filter @workspace/api-server dev
```
- Builds and starts the Express API server on port `5000` (or `$PORT`).
- Health check available at `http://localhost:5000/api/healthz`.

#### 🎨 Run Mockup Sandbox Web App
```bash
pnpm --filter @workspace/mockup-sandbox dev
```
- Starts the Vite development server for the UI playground sandbox.

---

### 3. Workspace Scripts & Utilities

#### 🔍 Full Workspace Typecheck
```bash
pnpm run typecheck
```
Runs TypeScript type checking across all workspace packages and libraries.

#### 📦 Build All Projects
```bash
pnpm run build
```
Typechecks and builds all applications and libraries in the workspace.

#### 📑 Regenerate API Spec & Hooks (Orval Codegen)
```bash
pnpm --filter @workspace/api-spec run codegen
```
Regenerates Zod schemas (`lib/api-zod`) and React Query hooks (`lib/api-client-react`) whenever `openapi.yaml` changes.

#### 🗄️ Database Schema Migration (Drizzle)
```bash
pnpm --filter @workspace/db run push
```
Pushes local Drizzle schema updates to the PostgreSQL database (requires `DATABASE_URL` environment variable).

---

## 🔑 Environment Variables

| Variable | Description | Required By |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `@workspace/db`, `@workspace/api-server` |
| `PORT` | API Server port (default: 5000) | `@workspace/api-server` |
| `NODE_ENV` | Environment mode (`development` / `production`) | All packages |

---

## 🎨 Design System Guidelines

SafeSig follows a light-theme design system:

- **Background**: `#F8FAFC`
- **Card Background**: `#FFFFFF`
- **Primary Blue**: `#2563EB`
- **Danger Red**: `#EF4444`
- **Warning Orange**: `#F59E0B`
- **Success Green**: `#10B981`
- **Text Primary**: `#1E293B`
- **Text Secondary**: `#64748B`
- **Border**: `#E2E8F0`
- **Borders & Radii**: `12px` for cards, `8px` for buttons/inputs
