import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ps_crm_token');
    if (token && config.headers) {
      config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message;
      if (status === 401) {
        localStorage.removeItem('ps_crm_token');
        localStorage.removeItem('ps_crm_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      if (status === 403) toast.error('Permission denied.');
      else if (status === 429) toast.error('Too many requests.');
      else if (status >= 500) toast.error('Server error. Try again later.');
    } else if (error.request) {
      toast.error('No response from server. Check your connection.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
