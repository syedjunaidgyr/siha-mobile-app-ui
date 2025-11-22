import api from '../config/api';

/**
 * Test if the backend server is reachable
 * Uses the configured API base URL to test connectivity
 */
export async function testBackendConnection(): Promise<boolean> {
  try {
    // Extract base URL from api instance (remove /v1 suffix)
    const baseUrl = api.defaults.baseURL?.replace('/v1', '') || 'http://13.203.161.24:4000';
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      console.log('Backend connection test: SUCCESS');
      return true;
    } else {
      console.log('Backend connection test: FAILED - Status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Backend connection test: FAILED - Error:', error);
    return false;
  }
}

/**
 * Test API endpoint connectivity
 */
export async function testAPIConnection(): Promise<boolean> {
  try {
    // Try a simple GET request to see if the API is reachable
    const response = await api.get('/health');
    console.log('API connection test: SUCCESS', response.data);
    return true;
  } catch (error: any) {
    console.error('API connection test: FAILED', error.message);
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - possible causes:');
      console.error('1. AWS Security Group not allowing port 4000');
      console.error('2. Server not running on AWS');
      console.error('3. Firewall blocking connection');
      console.error('4. Device has no internet connection');
    }
    return false;
  }
}

/**
 * Test direct connectivity to server (bypasses API client)
 */
export async function testDirectConnection(): Promise<boolean> {
  try {
    const baseUrl = api.defaults.baseURL?.replace('/v1', '') || 'http://13.203.161.24:4000';
    console.log('Testing direct connection to:', baseUrl);
    
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Direct connection test: SUCCESS', data);
      return true;
    } else {
      console.error('Direct connection test: FAILED - Status:', response.status);
      return false;
    }
  } catch (error: any) {
    console.error('Direct connection test: FAILED - Error:', error.message);
    return false;
  }
}

