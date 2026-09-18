import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import { StatusProvider } from './context/StatusContext';
import { MainLayout } from './layouts/MainLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ChatDashboard } from './pages/ChatDashboard';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route
              element={
                <ChatProvider>
                  <CallProvider>
                    <StatusProvider>
                      <MainLayout />
                    </StatusProvider>
                  </CallProvider>
                </ChatProvider>
              }
            >
              <Route path="/" element={<ChatDashboard />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
