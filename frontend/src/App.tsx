import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewScan from './pages/NewScan';
import ScanResults from './pages/ScanResults';
import HostDetails from './pages/HostDetails';
import ScanHistory from './pages/ScanHistory';
import CompareScans from './pages/CompareScans';
import Header from './components/Header';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen w-screen bg-gray-50">
          <Header />
          <main className="w-full py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/scan/new" element={<NewScan />} />
              <Route path="/scan/:scanId" element={<ScanResults />} />
              <Route path="/scan/:scanId/host/:hostId" element={<HostDetails />} />
              <Route path="/history" element={<ScanHistory />} />
              <Route path="/compare" element={<CompareScans />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App
