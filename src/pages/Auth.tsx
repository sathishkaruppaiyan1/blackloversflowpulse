
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <AuthForm mode={mode} onModeChange={setMode} />
    </div>
  );
};

export default Auth;
