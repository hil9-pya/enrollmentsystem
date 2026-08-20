import { createContext, useContext, useState, useEffect } from 'react';
import { clearApplicantAccess } from '../utils/authFetch.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    let cancelled = false;

    async function restoreSession() {
      if (!storedToken || !storedUser) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      setToken(storedToken);
      try {
        const response = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${storedToken}` },
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Profile refresh failed (${response.status})`);
        const refreshedUser = await response.json();
        if (!cancelled) {
          setUser(refreshedUser);
          localStorage.setItem('user', JSON.stringify(refreshedUser));
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Using stored account profile:', error.message);
          setUser(JSON.parse(storedUser));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorMsg = 'Login failed';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `Server error (Status ${response.status})`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearApplicantAccess();
  };

  const value = {
    user,
    token,
    login,
    logout,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
