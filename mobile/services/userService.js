import axios from 'axios';

// Sử dụng địa chỉ IP thực tế của máy tính của bạn
const API_URL = 'http://192.168.19.104:4000/api'; // Thay đổi IP này theo địa chỉ IP của máy tính của bạn

// Tạo instance axios với cấu hình mặc định
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // Timeout sau 10 giây
});

// Thêm interceptor để log request
api.interceptors.request.use(
    (config) => {
        console.log('Request:', {
            url: config.url,
            method: config.method,
            data: config.data,
            headers: config.headers
        });
        return config;
    },
    (error) => {
        console.error('Request Error:', error);
        return Promise.reject(error);
    }
);

// Thêm interceptor để log response
api.interceptors.response.use(
    (response) => {
        console.log('Response:', {
            status: response.status,
            data: response.data
        });
        return response;
    },
    (error) => {
        console.error('Response Error:', {
            message: error.message,
            code: error.code,
            response: error.response?.data
        });
        return Promise.reject(error);
    }
);

export const userService = {
    register: async (userData) => {
        try {
            const response = await api.post('/user/register', userData);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Register Error:', error);
            if (error.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Kết nối đến server bị timeout'
                };
            }
            if (error.message === 'Network Error') {
                return {
                    success: false,
                    error: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.'
                };
            }
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    },

    login: async (credentials) => {
        try {
            const response = await api.post('/user/login', credentials);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Login Error:', error);
            if (error.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Kết nối đến server bị timeout'
                };
            }
            if (error.message === 'Network Error') {
                return {
                    success: false,
                    error: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.'
                };
            }
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }
}; 