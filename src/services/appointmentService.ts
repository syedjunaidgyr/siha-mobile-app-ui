import api from '../config/api';

export interface Appointment {
  id: string;
  provider_id: string;
  appointment_time: string;
  status: string;
  notes?: string;
  provider?: {
    id: string;
    name: string;
    specialties: string[];
    hospital_name?: string;
  };
}

export interface Provider {
  id: string;
  name: string;
  specialties: string[];
  hospital_name?: string;
  email?: string;
  mobile?: string;
}

export class AppointmentService {
  static async getProviders(options?: { specialty?: string; search?: string }) {
    const params = new URLSearchParams();
    if (options?.specialty) params.append('specialty', options.specialty);
    if (options?.search) params.append('search', options.search);

    const response = await api.get(`/providers?${params.toString()}`);
    return response.data;
  }

  static async getProvider(providerId: string) {
    const response = await api.get(`/providers/${providerId}`);
    return response.data;
  }

  static async createAppointment(
    providerId: string,
    appointmentTime: string,
    notes?: string
  ) {
    const response = await api.post('/appointments', {
      provider_id: providerId,
      appointment_time: appointmentTime,
      notes,
    });
    return response.data;
  }

  static async getAppointments() {
    const response = await api.get('/appointments');
    return response.data;
  }

  static async getAppointment(appointmentId: string) {
    const response = await api.get(`/appointments/${appointmentId}`);
    return response.data;
  }

  static async updateAppointment(
    appointmentId: string,
    updates: { status?: string; notes?: string }
  ) {
    const response = await api.patch(`/appointments/${appointmentId}`, updates);
    return response.data;
  }
}

