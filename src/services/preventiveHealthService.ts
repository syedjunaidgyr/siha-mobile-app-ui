import api from '../config/api';

export interface PreventiveInsights {
  summary?: {
    headline?: string;
    nextBestAction?: string;
    statusLevel?: string;
  };
  news2?: { score: number; level: string };
  riskScores?: {
    feverProbability?: number;
    respiratoryProbability?: number;
    stressRecoveryIndex?: number;
  };
  lifestylePlan?: {
    hydrationTargetMl?: number;
    sleepTargetHours?: number;
    morning?: string[];
    afternoon?: string[];
    evening?: string[];
  };
  recommendations?: Array<{
    title: string;
    description: string;
    category?: string;
    priority?: string;
  }>;
  symptomForecast?: Array<{
    name: string;
    probability: number;
    confidence?: number;
    signals?: string[];
  }>;
  safety?: {
    requiresClinicianReview?: boolean;
    flags?: string[];
  };
  generatedAt?: string;
}

export class PreventiveHealthService {
  static async getInsights(options?: { lookbackDays?: number }): Promise<PreventiveInsights> {
    const response = await api.get('/ai/preventive-health', {
      params: options?.lookbackDays ? { lookbackDays: options.lookbackDays } : undefined,
    });
    return response.data.result;
  }

  static async previewInsights(metrics: any[], options?: { lookbackDays?: number }): Promise<PreventiveInsights> {
    const response = await api.post('/ai/preventive-health/preview', {
      metrics,
      lookbackDays: options?.lookbackDays,
    });
    return response.data.result;
  }
}

