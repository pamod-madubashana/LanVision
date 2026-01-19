import axios, { type AxiosInstance } from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login', { username, password });
    return response.data;
  }

  async register(username: string, email: string, password: string, confirmPassword: string) {
    const response = await this.client.post('/auth/register', { 
      username, 
      email, 
      password, 
      confirmPassword 
    });
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  // Scan endpoints
  async startScan(target: string, profile: string, name?: string) {
    const response = await this.client.post('/scans/start', { target, profile, name });
    return response.data;
  }

  async getScan(scanId: string) {
    const response = await this.client.get(`/scans/${scanId}`);
    return response.data;
  }

  async getScanHistory(page: number = 1, limit: number = 10) {
    const response = await this.client.get('/scans', {
      params: { page, limit }
    });
    return response.data;
  }

  async getHostDetails(scanId: string, hostId: string) {
    const response = await this.client.get(`/scans/${scanId}/hosts/${hostId}`);
    return response.data;
  }

  async compareScans(scanAId: string, scanBId: string) {
    const response = await this.client.post('/scans/compare', { scanAId, scanBId });
    return response.data;
  }
}

export default new ApiService();