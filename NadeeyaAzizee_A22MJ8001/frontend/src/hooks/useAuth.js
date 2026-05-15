import { useState, useEffect } from 'react';
import { usersAPI } from '../utils/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username) => {
    const normalized = String(username || '').trim();
    if (!normalized) throw new Error('Username is required');

    // API-backed mock auth: user must exist in /users
    const res = await usersAPI.getAll();
    const existing = res.data.find(
      (u) => String(u.username || '').toLowerCase() === normalized.toLowerCase()
    );

    if (!existing) {
      throw new Error('User not found. Try: admin or john.doe');
    }

    localStorage.setItem('user', JSON.stringify(existing));
    setUser(existing);
    return existing;
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return { user, isLoading, login, logout };
};
