You are an expert full-stack engineer. Build a portfolio-ready project called “Network Scanner Dashboard” (aka NetScope) with the following requirements.

GOAL
Create a full-stack web app that scans IPs/ranges/CIDR using Nmap from the backend, parses results, stores scan history in MongoDB, and displays everything in a modern React dashboard. No Cisco Packet Tracer, no physical devices. Works locally on Windows (PowerShell) and Linux. Provide clean UI screenshots-ready pages and a professional README.

TECH STACK
Frontend: React + TypeScript + Tailwind (or shadcn/ui if available)
Backend: Node.js + Express + TypeScript
Database: MongoDB (Mongoose)
Scanner engine: nmap CLI executed from backend
Optional: Socket.io for realtime scan progress

PROJECT STRUCTURE
repo/
  backend/
    src/
      server.ts
      routes/
      controllers/
      services/
        nmapService.ts
        parser/
          nmapXmlParser.ts
      middleware/
        auth.ts
        rateLimit.ts
        validate.ts
      models/
        User.ts
        Scan.ts
      utils/
        logger.ts
        sanitize.ts
  frontend/
    src/
      pages/
      components/
      api/
      hooks/
      types/
  README.md

CORE FEATURES
1) Scanning Inputs
- Accept target as:
  - Single host: 192.168.1.10
  - Range: 192.168.1.1-254
  - CIDR: 192.168.1.0/24
- Validate input format robustly
- Provide scan profiles:
  - Quick scan: nmap -T4 -F <target>
  - Full scan: nmap -sV -O <target>
  - Custom (optional): allow toggles like -sV, -O, -p <ports> but keep safe defaults

2) Results to Capture Per Host
- host IP
- hostname (if resolved)
- status (up/down)
- open ports list with:
  - port number
  - protocol (tcp/udp)
  - state (open/filtered/closed)
  - service name (http/ssh/etc)
  - version info if available
- OS fingerprint (only if enabled and available)
- scan duration + timestamp

3) Risk Labeling (Auto)
Implement a basic risk score based on detected open ports/services:
- Low: only common safe ports (e.g., 80/443)
- Medium: includes sensitive admin ports (e.g., 22/3389) or multiple services
- High: includes known risky ports/services (e.g., 23 telnet, 21 ftp, 445 smb, 3306 mysql exposed, 27017 mongodb exposed)
Return risk_level and risk_reasons array for each host.

4) History + Comparison
- Save each scan into MongoDB with:
  - scan name (optional)
  - target string
  - profile used
  - createdAt
  - summary stats: total_hosts, hosts_up, total_open_ports
  - per-host results
- Provide scan history page with pagination
- Compare two scans: show differences in hosts up/down and ports opened/closed per host

5) Security + Safety
- Authentication (simple but real):
  - JWT auth
  - roles: admin/user
  - only logged-in users can run scans
- Rate limit scan requests per user/IP
- Input sanitization to prevent command injection:
  - do NOT pass raw user input to shell
  - use spawn/execFile with args array
  - whitelist allowed characters for target input (digits, dots, slash, dash)
- Audit logging:
  - who started scan, when, target, profile
- IMPORTANT: tool must be safe and not become a hacking tool:
  - restrict scanning to private/local ranges by default (RFC1918: 10.0.0.0/8, 172.16-31.0.0/16, 192.168.0.0/16)
  - allow override only via ADMIN config flag (default false)
  - show warning in UI if trying to scan public IPs

FRONTEND UI PAGES (React)
1) Login page
2) Dashboard overview
- quick stats cards (total scans, last scan summary, hosts up)
- recent scans list
3) New Scan page
- input field target
- dropdown scan profile (Quick / Full)
- button “Start Scan”
- show realtime progress (or simulated progress if realtime not implemented)
4) Scan Results page
- results table: Host IP | Hostname | Status | Risk | Open Ports Count | View
- filters: status (up), risk level, search by IP/hostname
5) Host Details page
- show host summary and open ports table
- show risk reasons
6) Scan History page
- list scans with date, target, profile, hosts up, open ports
- open scan details
7) Compare Scans page
- select scan A and scan B
- show diff summary + per-host port changes

UI QUALITY
- Clean modern design, responsive
- Use badges for risk level (Low/Medium/High)
- Use tables + cards
- Provide loading states and error states

BACKEND API (Express)
Auth:
- POST /api/auth/register (optional for first admin seed)
- POST /api/auth/login -> JWT
Scans:
- POST /api/scans/start
  body: { target, profile }
  returns: scanId and initial status
- GET /api/scans/:scanId -> full scan data
- GET /api/scans -> paginated list
- GET /api/scans/:scanId/hosts/:hostId -> host detail
- POST /api/scans/compare
  body: { scanAId, scanBId }
  returns: diffs
Optional realtime:
- WebSocket events: scan_progress, scan_complete

NMAP EXECUTION + PARSING
- Execute nmap with XML output for reliable parsing:
  - nmap <args> -oX -
- Parse XML output into structured JSON
- Handle errors gracefully:
  - nmap not installed
  - permission issues for OS detection
- On Windows, document installation steps for Nmap and ensure path usage works.

DATABASE SCHEMA (Mongoose)
User:
- username, email, passwordHash, role, createdAt
Scan:
- userId
- name (optional)
- target
- profile
- startedAt, finishedAt, durationMs
- summary: totalHosts, hostsUp, totalOpenPorts
- results: array of HostResult
HostResult:
- ip, hostname, status
- riskLevel, riskScore, riskReasons[]
- ports: [{ port, protocol, state, service, version }]
- osGuess (optional)
- lastSeenAt

EXPORT (Nice-to-have)
- Export scan report as PDF or HTML
- Include summary + host list + port details

README REQUIREMENTS
- Project overview + features
- Tech stack
- Screenshots placeholders
- Setup steps for backend/frontend
- Nmap installation notes (Windows + Linux)
- Environment variables list:
  - MONGO_URI
  - JWT_SECRET
  - ADMIN_ALLOW_PUBLIC_SCAN (default false)
  - PORT
- Example API requests
- Security notes about scan restrictions

DELIVERABLES
- Working frontend + backend with TypeScript
- Clean code, modular services
- Proper error handling
- Sample seed data or demo scan record
- Clear instructions to run:
  - cd backend && npm i && npm run dev
  - cd frontend && npm i && npm run dev

Start by scaffolding the repository, then implement backend (auth, scan engine, parser, DB), then frontend pages, then compare feature, then polish UI and README.
