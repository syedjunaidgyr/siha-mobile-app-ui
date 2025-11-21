import api from '../config/api';

export interface LifestylePrediction {
  id: string;
  user_id: string;
  prediction_date: string;
  predicted_calories: number;
  predicted_protein: number;
  predicted_carbs: number;
  predicted_fats: number;
  recommended_workout_duration: number;
  recommended_workout_type: string;
  recommended_steps: number;
  sleep_hours: number;
  water_intake_liters: number;
  lifestyle_score: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export class LifestyleService {
  static async getPrediction(date?: string): Promise<LifestylePrediction> {
    const params = date ? { date } : {};
    const response = await api.get('/lifestyle/predict', { params });
    return response.data;
  }

  static async getPredictions(startDate: string, endDate: string): Promise<LifestylePrediction[]> {
    const response = await api.get('/lifestyle/predict', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
    return response.data.predictions || [];
  }

  static async generatePrediction(): Promise<LifestylePrediction> {
    const response = await api.post('/lifestyle/predict');
    return response.data.prediction;
  }
}

