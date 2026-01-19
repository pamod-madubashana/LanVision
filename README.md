# Network Scanner Dashboard (NetScope)

A full-stack web application for network scanning and security assessment using Nmap, built with React, Node.js, and MongoDB.

## Features

### 🎯 Core Functionality
- **Network Scanning**: Scan IP addresses, ranges, and CIDR blocks using Nmap
- **Security Assessment**: Automatic risk scoring based on discovered services
- **Scan History**: Store and review previous scan results
- **Comparison Tool**: Compare scans to track network changes over time
- **Real-time Updates**: Live scan progress monitoring

### 🔒 Security Features
- **JWT Authentication**: Secure user authentication and session management
- **Role-based Access**: Admin and user roles with appropriate permissions
- **Input Validation**: Strict validation to prevent command injection
- **Rate Limiting**: Protection against abuse and automated attacks
- **Audit Logging**: Comprehensive logging of all user actions
- **Private Network Restriction**: Default restriction to RFC1918 private ranges

### 📊 Dashboard & Visualization
- **Overview Statistics**: Quick insights into network status
- **Risk Assessment**: Color-coded risk levels (Low/Medium/High)
- **Detailed Host Information**: Port listings, service detection, OS guessing
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## Tech Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** REST API
- **MongoDB** with Mongoose ODM
- **Nmap** CLI integration
- **JWT** for authentication
- **Helmet** for security headers

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **Heroicons** for UI icons

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Nmap (network scanning tool)
- Git

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd LanVision
```

### 2. Backend Setup
```bash
cd backend
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration:
# - MONGO_URI: Your MongoDB connection string
# - JWT_SECRET: Strong secret key for JWT tokens
# - PORT: Backend server port (default: 3000)
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

## Nmap Installation

### Windows
1. Download Nmap from [nmap.org](https://nmap.org/download.html)
2. Install and add to PATH
3. Verify installation: `nmap --version`

### Linux/macOS
```bash
# Ubuntu/Debian
sudo apt-get install nmap

# macOS (Homebrew)
brew install nmap

# Verify installation
nmap --version
```

## Running the Application

### Development Mode

**Start Backend:**
```bash
cd backend
npm run dev
```

**Start Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Production Mode

**Build and Start Backend:**
```bash
cd backend
npm run build
npm start
```

**Build and Start Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## Environment Variables

### Backend (.env)
```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/netscope

# JWT Secret (change this!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3000
NODE_ENV=development

# Security Configuration
ADMIN_ALLOW_PUBLIC_SCAN=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Scans
- `POST /api/scans/start` - Start new network scan
- `GET /api/scans/:scanId` - Get scan results
- `GET /api/scans` - Get scan history (paginated)
- `GET /api/scans/:scanId/hosts/:hostId` - Get host details
- `POST /api/scans/compare` - Compare two scans

## Security Notes

⚠️ **Important Security Considerations:**

1. **Network Restrictions**: By default, only private IP ranges (RFC1918) are allowed
2. **Command Injection**: All user inputs are sanitized and validated
3. **Rate Limiting**: Prevents abuse of the scanning functionality
4. **Authentication Required**: All scan operations require valid JWT tokens
5. **Admin Override**: Public IP scanning requires explicit admin configuration

## Usage Guide

### Getting Started
1. Register a new account or log in with existing credentials
2. Navigate to "New Scan" to start your first network scan
3. Enter a target (IP, CIDR, or range) and select scan profile
4. Monitor scan progress in real-time
5. Review results and host details
6. Use "Compare" to analyze network changes over time

### Scan Profiles
- **Quick Scan**: Fast scan focusing on common ports (`-T4 -F`)
- **Full Scan**: Comprehensive scan with service and OS detection (`-sV -O`)

### Risk Levels
- **Low**: Common safe ports only (HTTP, HTTPS)
- **Medium**: Administrative ports or multiple services
- **High**: Known risky services (Telnet, FTP, SMB, databases)

## Project Structure

```
LanVision/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic (Nmap, parsing)
│   │   ├── utils/           # Helper functions
│   │   └── server.ts        # Main application entry
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # API service layer
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React context providers
│   │   ├── pages/           # Page components
│   │   ├── App.tsx          # Main application component
│   │   └── main.tsx         # Entry point
│   └── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Nmap](https://nmap.org/) - Network discovery and security auditing tool
- [MongoDB](https://www.mongodb.com/) - Database solution
- [React](https://reactjs.org/) - Frontend library
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework