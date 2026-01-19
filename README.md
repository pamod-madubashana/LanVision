# LanVision - Network Security Scanner

LanVision is a comprehensive network security assessment platform that provides real-time network scanning capabilities using Nmap. The platform offers a modern web interface for conducting network scans, analyzing results, and tracking security vulnerabilities.

## Features

- **Real-time Scan Monitoring**: Live streaming of Nmap scan progress with Server-Sent Events (SSE)
- **Comprehensive Network Scanning**: Supports various Nmap profiles (quick, balanced, full, custom)
- **Interactive Dashboard**: Visual representation of scan results with risk assessment
- **Scan History**: Track and compare previous scans
- **Detailed Host Analysis**: Comprehensive information about discovered hosts and services
- **Risk Scoring**: Automated security risk assessment for discovered vulnerabilities
- **Cross-platform Support**: Works on Windows, macOS, and Linux

## Architecture

LanVision is built with a modern full-stack architecture:

- **Frontend**: React with TypeScript, Tailwind CSS, and Vite
- **Backend**: Node.js with Express and TypeScript
- **Database**: MongoDB for storing scan results and user data
- **Scanning Engine**: Nmap for network discovery and security auditing

## Prerequisites

Before installing LanVision, ensure you have the following software installed:

- Node.js (v16 or higher)
- npm or yarn package manager
- MongoDB (local or cloud instance)
- Nmap (network mapping tool)

### Installing Nmap

**Windows:**
- Download from [https://nmap.org/download.html](https://nmap.org/download.html)
- Install with default settings
- Ensure `nmap.exe` is in your system PATH

**macOS:**
```bash
brew install nmap
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install nmap
```

**Linux (CentOS/RHEL/Fedora):**
```bash
sudo yum install nmap
# or
sudo dnf install nmap
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/LanVision.git
cd LanVision
```

2. Install dependencies for both backend and frontend:
```bash
npm install
cd backend
npm install
cd ../frontend
npm install
cd ..
```

3. Set up environment variables:
Create a `.env` file in the `backend` directory based on the `.env.example`:
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/lanvision
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:3000
ADMIN_ALLOW_PUBLIC_SCAN=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. Start the development servers:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
LanVision/
├── backend/
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── middleware/      # Authentication and validation middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic and external integrations
│   │   │   └── parser/      # Data parsing utilities
│   │   ├── tests/           # Test files
│   │   └── utils/           # Utility functions
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── api/             # API service functions
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React context providers
│   │   ├── pages/           # Application pages/views
│   │   └── types/           # TypeScript type definitions
│   └── ...
├── README.md
└── ...
```

## Usage

1. **Create Account/Login**: Register or login to access the scanning features
2. **Configure Scan**: Select target IP/network range and scan profile
3. **Start Scan**: Initiate the network scan
4. **Monitor Progress**: Watch real-time scan progress in the live log stream
5. **Review Results**: Analyze discovered hosts, open ports, services, and risk assessments
6. **Export/Compare**: Save results or compare with previous scans

## API Endpoints

The backend provides a RESTful API with the following main endpoints:

- `POST /api/scans/start` - Start a new scan
- `POST /api/scans/builder/start` - Start a custom scan with advanced options
- `GET /api/scans/:scanId` - Get scan results
- `GET /api/scans/:scanId/stream` - Stream real-time scan logs (SSE)
- `GET /api/scans` - Get scan history
- `POST /api/scans/compare` - Compare two scan results
- `GET /api/scans/health/nmap` - Check Nmap availability

## Security Features

- JWT-based authentication
- Rate limiting to prevent abuse
- Input sanitization to prevent command injection
- Secure session management
- Protected scan history (users can only access their own scans)

## Development

To contribute to LanVision:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Running Tests

Backend tests:
```bash
cd backend
npm test
```

## Contributing

We welcome contributions! Please see our contributing guidelines for details on how to participate in the project.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with the powerful Nmap network exploration tool
- Inspired by the need for accessible network security tools
- Thanks to the open-source community for the technologies that power this project