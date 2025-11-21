import api from '../config/api';

export interface Profile {
  id: string;
  name?: string;
  email: string;
  mobile: string;
  gender?: 'male' | 'female' | 'other';
  height?: number;
  weight?: number;
  date_of_birth?: string;
  goal?: 'weight_loss' | 'weight_gain' | 'muscle_gain' | 'maintain' | 'general_fitness' | 'improve_endurance';
  profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  name?: string;
  gender?: 'male' | 'female' | 'other';
  height?: number;
  weight?: number;
  date_of_birth?: string;
  goal?: 'weight_loss' | 'weight_gain' | 'muscle_gain' | 'maintain' | 'general_fitness' | 'improve_endurance';
}

export class ProfileService {
  static async getProfile(): Promise<Profile> {
    const response = await api.get('/profile');
    return response.data;
  }

  static async updateProfile(data: ProfileUpdateData): Promise<Profile> {
    const response = await api.put('/profile', data);
    return response.data.profile;
  }

  static async isProfileComplete(): Promise<boolean> {
    const response = await api.get('/profile/complete');
    return response.data.profile_complete;
  }
}

