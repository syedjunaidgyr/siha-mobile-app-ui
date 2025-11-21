import api from '../config/api';

export interface Metric {
  id: string;
  metric_type: string;
  value: number;
  unit: string;
  start_time: string;
  end_time?: string;
  source: string;
}

export interface MetricInput {
  metric_type: string;
  value: number;
  unit: string;
  start_time: string;
  end_time?: string;
  source?: string;
  raw_payload?: object;
  confidence?: number;
  device_id?: string;
}

export class MetricService {
  static async syncHealthKit(metrics: MetricInput[], deviceId?: string) {
    const response = await api.post('/sync/healthkit', {
      metrics,
      device_id: deviceId,
    });
    return response.data;
  }

  static async syncHealthConnect(metrics: MetricInput[], deviceId?: string) {
    const response = await api.post('/sync/health-connect', {
      metrics,
      device_id: deviceId,
    });
    return response.data;
  }

  static async getMetrics(
    userId: string,
    options?: {
      type?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const params = new URLSearchParams();
    if (options?.type) params.append('type', options.type);
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await api.get(`/users/${userId}/metrics?${params.toString()}`);
    return response.data;
  }
}

