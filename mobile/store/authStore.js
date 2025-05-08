import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://192.168.19.104:4000/api';

const ADMIN_EMAIL = "admin@gmail.com"; // thêm email admin
const ADMIN_PASSWORD = "admin123";     // thêm password admin

const useAuthStore = create((set) => ({
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    role: null, // Thêm role vào state

    initialize: async () => {
        try {
            const userStr = await AsyncStorage.getItem('user');
            if (userStr) {
                set({ user: JSON.parse(userStr) });
            }
        } catch (error) {
            console.error('Error initializing auth store:', error);
        }
    },

    setToken: async (newToken) => {
        try {
            await AsyncStorage.setItem('token', newToken);
            set({ token: newToken, isAuthenticated: true });
        } catch (error) {
            console.error('Error setting token:', error);
        }
    },

    removeToken: async () => {
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('role');
            set({ token: null, user: null, isAuthenticated: false, role: null });
        } catch (error) {
            console.error('Error removing token:', error);
        }
    },

    setUser: async (user) => {
        if (user) {
            await AsyncStorage.setItem('user', JSON.stringify(user));
        } else {
            await AsyncStorage.removeItem('user');
        }
        set({ user });
    },

    logout: async () => {
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('role');
            set({ token: null, user: null, isAuthenticated: false, role: null });
        } catch (error) {
            console.error('Error during logout:', error);
        }
    },

    register: async (username, email, phone, password_1, password_2) => {
        try {
            set({ isLoading: true, error: null });
            const response = await axios.post(`${API_URL}/user/register`, {
                username,
                email,
                phone,
                password_1,
                password_2
            });

            if (response.data.success) {
                const token = response.data.accesstoken;
                await AsyncStorage.setItem('token', token);
                
                set({ 
                    token,
                    isAuthenticated: true,
                    isLoading: false 
                });
                
                return { success: true, data: response.data };
            } else {
                throw new Error(response.data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    login: async (email, password) => {
        try {
            set({ isLoading: true, error: null });
            const response = await axios.post(`${API_URL}/user/login`, {
                email,
                password
            });

            if (response.data.success && response.data.accesstoken) {
                const token = response.data.accesstoken;
                await AsyncStorage.setItem('token', token);
                
                set({ 
                    token,
                    isAuthenticated: true,
                    isLoading: false 
                });
                
                return { success: true, data: response.data };
            } else {
                throw new Error(response.data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    clearError: () => {
        set({ error: null });
    },

    checkAuth: async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userJson = await AsyncStorage.getItem('user');
            const role = await AsyncStorage.getItem('role');
            const user = userJson ? JSON.parse(userJson) : null;

            set({ user, token, role });
        } catch (error) {
            console.error('Error checking auth:', error);
        }
    },

    isAdmin: () => {
        const user = useAuthStore.getState().user;
        return user?.role === 'admin';
    },

    isUser: () => {
        const state = useAuthStore.getState();
        return state.role === 'user';
    }
}));

export { useAuthStore };
