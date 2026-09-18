import axios from 'axios';

// Resolve backend API URL from VITE_API_URL environment variable.
// If VITE_API_URL is not set, use '/api' for same-origin (Render, local dev, or cloud container).
const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const isLocalhostBrowser = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isLocalhostEnv = rawApiUrl.includes('localhost') || rawApiUrl.includes('127.0.0.1');

    // If an external backend URL is specified and not an invalid localhost reference in a remote browser:
    if (rawApiUrl && (!isLocalhostEnv || isLocalhostBrowser)) {
      if (rawApiUrl.startsWith('/') || rawApiUrl.startsWith(window.location.origin)) {
        return '/api';
      }
      const trimmed = rawApiUrl.replace(/\/+$/, '');
      return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
    }
    // Default to relative '/api' which cleanly works in all browsers and environments
    return '/api';
  }

  if (rawApiUrl) {
    const trimmed = rawApiUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return 'http://localhost:3000/api';
}

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT token and prevent duplicate /api in paths
api.interceptors.request.use(
  (config) => {
    // 1. Prevent duplicate /api if a service path accidentally includes leading /api
    if (config.url) {
      if (config.url === '/api') {
        config.url = '';
      } else if (config.url.startsWith('/api/')) {
        config.url = config.url.substring(4);
      }
    }

    // 2. Attach Authorization: Bearer <token>
    const token = localStorage.getItem('simplechat_token');
    if (token && token !== 'null' && token !== 'undefined' && config.headers) {
      config.headers.Authorization = `Bearer ${token.trim()}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 unauthorized cleanly
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      // Only clear storage on protected route failures, not on active login/register submissions
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('simplechat_token');
        localStorage.removeItem('simplechat_user');
      }
    }
    return Promise.reject(error);
  }
);
