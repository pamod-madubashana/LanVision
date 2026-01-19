# Quick Start Guide

## Prerequisites Checklist
- [ ] Node.js (v16+) installed
- [ ] MongoDB installed or cloud instance available
- [ ] Nmap installed and in PATH
- [ ] Git installed

## Quick Setup (5 minutes)

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd LanVision
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run dev
```

### 3. Frontend Setup (in new terminal)
```bash
cd frontend
npm install
npm run dev
```

### 4. Create Admin User
Visit `http://localhost:3000/api/auth/create-admin` or use the test script:
```bash
cd backend
npm test
```

### 5. Login and Start Scanning
1. Visit `http://localhost:5173`
2. Login with:
   - Username: `admin`
   - Password: `admin123`
3. Go to "New Scan" and scan `127.0.0.1` for testing

## Common Issues

### Nmap Not Found
**Windows**: Add Nmap to PATH or install from nmap.org
**Linux**: `sudo apt-get install nmap`

### MongoDB Connection Failed
- Ensure MongoDB is running
- Check your MONGO_URI in `.env`
- Test connection: `mongosh mongodb://localhost:27017`

### Port Already in Use
Change PORT in `.env` or kill the process using the port:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :3000
kill -9 <PID>
```

## Development Commands

### Backend
```bash
npm run dev      # Development mode with auto-reload
npm run build    # Compile TypeScript
npm start        # Run compiled code
npm test         # Run integration tests
```

### Frontend
```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

## Security Notes
- Default JWT secret should be changed in production
- Private network scanning only by default
- Rate limiting protects against abuse
- All inputs are sanitized and validated

## Next Steps
1. Customize branding in `frontend/src/components/Header.tsx`
2. Adjust risk scoring in `backend/src/services/parser/nmapXmlParser.ts`
3. Add custom scan profiles in `backend/src/services/nmapService.ts`
4. Extend UI components in `frontend/src/components/`

Need help? Check the full README.md for detailed documentation.