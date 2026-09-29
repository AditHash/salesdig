import axios from "axios";
 
const API = axios.create({
    // baseURL: process.env.VITE_API_BASE_URL,
    baseURL: import.meta.env.VITE_BACKEND_URL,
})
 
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
})
 
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem("token");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);
 
export default API