import { create } from 'zustand';

let savedUser = null;
try {
  const stored = localStorage.getItem('edulayout_user');
  if (stored) savedUser = JSON.parse(stored);
} catch (e) {
  savedUser = null;
}

export const useAuthStore = create((set) => ({
  user: savedUser,
  token: localStorage.getItem('token') || null,

  login: (userData, token = 'token-demo') => {
    try {
      localStorage.setItem('edulayout_user', JSON.stringify(userData));
      localStorage.setItem('token', token);
    } catch (e) {}
    set({ user: userData, token });
  },

  logout: () => {
    try {
      localStorage.removeItem('edulayout_user');
      localStorage.removeItem('token');
    } catch (e) {}
    set({ user: null, token: null });
  }
}));
