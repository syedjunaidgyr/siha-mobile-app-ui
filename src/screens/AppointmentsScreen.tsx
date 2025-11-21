import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Calendar, Clock, User } from 'lucide-react-native';
import { AppointmentService, Appointment } from '../services/appointmentService';

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const data = await AppointmentService.getAppointments();
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'completed':
        return '#6b7280';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
        <Text style={styles.subtitle}>Manage your healthcare appointments</Text>
      </View>

      {appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No appointments scheduled</Text>
          <Text style={styles.emptyStateSubtext}>
            Book an appointment with a healthcare provider
          </Text>
        </View>
      ) : (
        appointments.map((appointment) => (
          <View key={appointment.id} style={styles.appointmentCard}>
            <View style={styles.appointmentHeader}>
              <View style={styles.appointmentInfo}>
                {appointment.provider && (
                  <>
                    <View style={styles.providerRow}>
                      <User size={20} color="#2563eb" />
                      <Text style={styles.providerName}>{appointment.provider.name}</Text>
                    </View>
                    {appointment.provider.hospital_name && (
                      <Text style={styles.hospitalName}>
                        {appointment.provider.hospital_name}
                      </Text>
                    )}
                  </>
                )}
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(appointment.status) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(appointment.status) },
                  ]}
                >
                  {appointment.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.appointmentDetails}>
              <View style={styles.detailRow}>
                <Calendar size={16} color="#6b7280" />
                <Text style={styles.detailText}>
                  {new Date(appointment.appointment_time).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Clock size={16} color="#6b7280" />
                <Text style={styles.detailText}>
                  {new Date(appointment.appointment_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>

            {appointment.notes && (
              <Text style={styles.notes}>{appointment.notes}</Text>
            )}
          </View>
        ))
      )}

      <TouchableOpacity style={styles.bookButton}>
        <Text style={styles.bookButtonText}>+ Book Appointment</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  hospitalName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  notes: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  bookButton: {
    margin: 20,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

