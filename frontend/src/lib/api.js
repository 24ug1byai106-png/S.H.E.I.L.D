import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const analyzeImage = async (file, category = 'building', userDescription = '', locationName = '') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  if (userDescription) {
    formData.append('user_description', userDescription);
  }
  if (locationName) {
    formData.append('location_name', locationName);
  }

  try {
    const response = await axios.post(`${API_URL}/analyze`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.error("API error", error);
    throw error;
  }
};

export const getReports = async (skip = 0, limit = 50) => {
  try {
    const response = await axios.get(`${API_URL}/reports?skip=${skip}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("API error fetching reports:", error);
    return [];
  }
};

export const getReportById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/reports/${id}`);
    return response.data;
  } catch (error) {
    console.error(`API error fetching report ${id}:`, error);
    throw error;
  }
};

export const getAnalytics = async () => {
  try {
    const response = await axios.get(`${API_URL}/analytics`);
    return response.data;
  } catch (error) {
    console.error("API error fetching analytics:", error);
    return null;
  }
};

export const getAlerts = async () => {
  try {
    const response = await axios.get(`${API_URL}/alerts`);
    return response.data;
  } catch (error) {
    console.error("API error fetching alerts:", error);
    return [];
  }
};
