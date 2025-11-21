import api from '../config/api';

/**
 * Test if the backend server is reachable
 */
export async function testBackendConnection(): Promise<boolean> {
  try {
    // Try to hit the health endpoint (should be at /health, not /v1/health)
    const response = await fetch('http://10.0.2.2:3000/health', {
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
    return false;
  }
}

