import api from '../config/api';

export interface Device {
  id: string;
  vendor: string;
  device_id: string;
  device_name?: string;
  last_sync: string;
  is_active: boolean;
}

export class DeviceService {
  static async linkDevice(
    vendor: string,
    deviceId: string,
    deviceName?: string,
    oauthTokens?: {
      access_token?: string;
      refresh_token?: string;
      expires_at?: string;
    }
  ) {
    const response = await api.post('/devices/link', {
      vendor,
      device_id: deviceId,
      device_name: deviceName,
      oauth_tokens: oauthTokens,
    });
    return response.data;
  }

  static async getDevices() {
    const response = await api.get('/devices');
    return response.data;
  }

  static async syncDevice(deviceId: string) {
    const response = await api.post(`/devices/${deviceId}/sync`);
    return response.data;
  }

  static async deactivateDevice(deviceId: string) {
    const response = await api.delete(`/devices/${deviceId}`);
    return response.data;
  }
}

