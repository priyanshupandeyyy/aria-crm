import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Response interceptor — log errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ── Customers ────────────────────────────────────────────────────────────────

export const getCustomers = async (params) => {
  const res = await api.get('/customers', { params });
  return res.data;
};

export const getCustomerStats = async () => {
  const res = await api.get('/customers/stats/summary');
  return res.data;
};

export const getCustomerById = async (id) => {
  const res = await api.get(`/customers/${id}`);
  return res.data;
};

export const getAIRecommendations = async () => {
  const res = await api.get('/customers/ai-recommendations');
  return res.data;
};

// ── Segments ─────────────────────────────────────────────────────────────────

export const getSegments = async () => {
  const res = await api.get('/segments');
  return res.data;
};

export const getSegmentById = async (id) => {
  const res = await api.get(`/segments/${id}`);
  return res.data;
};

export const createSegment = async (data) => {
  const res = await api.post('/segments', data);
  return res.data;
};

export const deleteSegment = async (id) => {
  const res = await api.delete(`/segments/${id}`);
  return res.data;
};

export const previewSegment = async (rules) => {
  const res = await api.post('/segments/preview', { rules });
  return res.data;
};

export const generateSegmentFromNL = async (query) => {
  const res = await api.post('/segments/generate-from-nl', { query });
  return res.data;
};

// ── Campaigns ────────────────────────────────────────────────────────────────

export const getCampaigns = async () => {
  const res = await api.get('/campaigns');
  return res.data;
};

export const getCampaignById = async (id) => {
  const res = await api.get(`/campaigns/${id}`);
  return res.data;
};

export const createCampaign = async (data) => {
  const res = await api.post('/campaigns', data);
  return res.data;
};

export const launchCampaign = async (id) => {
  const res = await api.post(`/campaigns/${id}/launch`);
  return res.data;
};

export const getCampaignStats = async (id) => {
  const res = await api.get(`/campaigns/${id}/stats`);
  return res.data;
};

export const generateMessage = async (segment_id) => {
  const res = await api.post('/campaigns/generate-message', { segment_id });
  return res.data;
};

export const analyzeCampaign = async (id) => {
  const res = await api.post(`/campaigns/${id}/analyze`);
  return res.data;
};

// ── ARIA Assistant ───────────────────────────────────────────────────────────
// ARIA endpoints involve multiple chained AI calls, so we use a longer timeout.

export const ariaPlan = async (message, history = []) => {
  const res = await api.post('/aria/plan', { message, conversation_history: history }, { timeout: 60000 });
  return res.data;
};

export const ariaLaunch = async (data) => {
  const res = await api.post('/aria/launch', data, { timeout: 60000 });
  return res.data;
};

export const ariaDraft = async (data) => {
  const res = await api.post('/aria/draft', data);
  return res.data;
};

export default api;

