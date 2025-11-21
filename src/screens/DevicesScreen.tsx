import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Smartphone, Watch, Activity } from 'lucide-react-native';
import { DeviceService } from '../services/deviceService';
import { Device } from '../services/deviceService';

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [addingDevice, setAddingDevice] = useState(false);
  const [syncingDevices, setSyncingDevices] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const data = await DeviceService.getDevices();
      setDevices(data);
    } catch (error: any) {
      console.error('Error loading devices:', error);
      // Show user-friendly error message
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        // Network error - don't show alert on initial load, just log
        console.warn('Network error: Make sure backend is running and device can reach it');
      } else if (error.response?.status === 401) {
        // Unauthorized - token might be expired
        console.warn('Authentication error: Please login again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDevice = async (deviceId: string) => {
    // Add device to syncing set
    setSyncingDevices((prev) => new Set(prev).add(deviceId));

    try {
      await DeviceService.syncDevice(deviceId);
      
      // Reload devices to get updated last_sync timestamp
      await loadDevices();
      
      Alert.alert('Success', 'Device synced successfully!');
    } catch (error: any) {
      console.error('Error syncing device:', error);
      Alert.alert(
        'Sync Failed',
        error.response?.data?.error || error.message || 'Failed to sync device. Please try again.'
      );
    } finally {
      // Remove device from syncing set
      setSyncingDevices((prev) => {
        const next = new Set(prev);
        next.delete(deviceId);
        return next;
      });
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    Alert.alert(
      'Remove Device',
      'Are you sure you want to remove this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await DeviceService.deactivateDevice(deviceId);
              await loadDevices();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to remove device');
            }
          },
        },
      ]
    );
  };

  const handleAddDevice = () => {
    setShowAddModal(true);
    setSelectedVendor('');
    setDeviceName('');
    setDeviceId('');
  };

  const selectVendor = (vendor: string) => {
    setSelectedVendor(vendor);
    // Auto-generate device ID for demo purposes
    if (!deviceId) {
      setDeviceId(`${vendor}_${Date.now()}`);
    }
    if (!deviceName) {
      const vendorNames: { [key: string]: string } = {
        healthkit: 'Apple Health',
        health_connect: 'Google Health Connect',
        fitbit: 'Fitbit',
        garmin: 'Garmin',
        samsung: 'Samsung Health',
        other: 'Other Device',
      };
      setDeviceName(vendorNames[vendor] || vendor);
    }
  };

  const handleLinkDevice = async () => {
    if (!selectedVendor || !deviceId) {
      Alert.alert('Error', 'Please select a device type and ensure device ID is set');
      return;
    }

    setAddingDevice(true);
    try {
      await DeviceService.linkDevice(
        selectedVendor,
        deviceId,
        deviceName || undefined
      );
      setShowAddModal(false);
      setSelectedVendor('');
      setDeviceName('');
      setDeviceId('');
      await loadDevices();
      Alert.alert('Success', 'Device added successfully!');
    } catch (error: any) {
      console.error('Error adding device:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || error.message || 'Failed to add device'
      );
    } finally {
      setAddingDevice(false);
    }
  };

  const vendorOptions = [
    { value: 'healthkit', label: 'Apple Health (HealthKit)', icon: '📱' },
    { value: 'health_connect', label: 'Google Health Connect', icon: '📱' },
    { value: 'fitbit', label: 'Fitbit', icon: '⌚' },
    { value: 'garmin', label: 'Garmin', icon: '⌚' },
    { value: 'samsung', label: 'Samsung Health', icon: '⌚' },
    { value: 'other', label: 'Other Device', icon: '📊' },
  ];

  const getDeviceIcon = (vendor: string) => {
    switch (vendor) {
      case 'healthkit':
      case 'health_connect':
        return <Smartphone size={24} color="#2563eb" />;
      case 'fitbit':
      case 'garmin':
      case 'samsung':
        return <Watch size={24} color="#2563eb" />;
      default:
        return <Activity size={24} color="#2563eb" />;
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
        <Text style={styles.title}>Connected Devices</Text>
        <Text style={styles.subtitle}>Manage your health device connections</Text>
      </View>

      {devices.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No devices connected</Text>
          <Text style={styles.emptyStateSubtext}>
            Connect a device to start syncing your health data
          </Text>
        </View>
      ) : (
        devices.map((device) => (
          <View key={device.id} style={styles.deviceCard}>
            <View style={styles.deviceHeader}>
              {getDeviceIcon(device.vendor)}
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>
                  {device.device_name || device.vendor}
                </Text>
                <Text style={styles.deviceVendor}>{device.vendor}</Text>
                <Text style={styles.lastSync}>
                  Last sync: {new Date(device.last_sync).toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.deviceActions}>
              <TouchableOpacity
                style={[
                  styles.syncButton,
                  syncingDevices.has(device.id) && styles.syncButtonDisabled,
                ]}
                onPress={() => handleSyncDevice(device.id)}
                disabled={syncingDevices.has(device.id)}
              >
                {syncingDevices.has(device.id) ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveDevice(device.id)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleAddDevice}>
        <Text style={styles.addButtonText}>+ Add Device</Text>
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Device</Text>
            <Text style={styles.modalSubtitle}>Select a device type to connect</Text>

            <ScrollView style={styles.vendorList}>
              {vendorOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.vendorOption,
                    selectedVendor === option.value && styles.vendorOptionSelected,
                  ]}
                  onPress={() => selectVendor(option.value)}
                >
                  <Text style={styles.vendorIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.vendorLabel,
                      selectedVendor === option.value && styles.vendorLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedVendor && (
              <View style={styles.deviceForm}>
                <Text style={styles.formLabel}>Device Name (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter device name"
                  value={deviceName}
                  onChangeText={setDeviceName}
                  placeholderTextColor="#9ca3af"
                />

                <Text style={styles.formLabel}>Device ID</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Device ID"
                  value={deviceId}
                  onChangeText={setDeviceId}
                  editable={true}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.linkButton, (!selectedVendor || !deviceId) && styles.linkButtonDisabled]}
                onPress={handleLinkDevice}
                disabled={!selectedVendor || !deviceId || addingDevice}
              >
                {addingDevice ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.linkButtonText}>Link Device</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  deviceCard: {
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
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceInfo: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  deviceVendor: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  lastSync: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  deviceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  syncButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  syncButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  removeButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  addButton: {
    margin: 20,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  vendorList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  vendorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  vendorOptionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  vendorIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  vendorLabel: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  vendorLabelSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  deviceForm: {
    marginTop: 20,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  linkButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

