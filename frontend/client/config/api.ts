// API Configuration
export const API_CONFIG = {
  // Use environment variable if available, otherwise use demo data
  VITE_API_URL: import.meta.env.VITE_API_URL || null,
  
  // Default endpoints
  ENDPOINTS: {
    HISTORICAL_PROFIT: '/api/historical-profit/'
  }
};

// Check if API is available
export const isApiAvailable = () => {
  return !!API_CONFIG.VITE_API_URL;
};

// Build API URL
export const buildHistoricalApiUrl = (params: {
  isin: string;
  start_date: string;
  amount: number;
  type: 'sip' | 'lumpsum';
  stepup?: number;
}) => {
  if (!isApiAvailable()) {
    return null;
  }
  
  const { isin, start_date, amount, type, stepup } = params;
  let url = `${API_CONFIG.VITE_API_URL}${API_CONFIG.ENDPOINTS.HISTORICAL_PROFIT}?isin=${isin}&start_date=${start_date}&amount=${amount}&type=${type}`;
  
  if (type === 'sip' && stepup !== undefined && stepup > 0) {
    url += `&stepup=${stepup}`;
  }
  
  return url;
};
