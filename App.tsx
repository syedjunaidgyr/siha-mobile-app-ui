import React, { useEffect, useState } from 'react';
import { StatusBar, Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import GoalSelectionScreen from './src/screens/GoalSelectionScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import VitalsScreen from './src/screens/VitalsScreen';
import VitalSignsDetailsScreen from './src/screens/VitalSignsDetailsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LifestylePredictionScreen from './src/screens/LifestylePredictionScreen';
import { AuthService } from './src/services/authService';
import { ProfileService } from './src/services/profileService';
import { BottomNavBar } from './src/components/navigation/BottomNavBar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ navigation }: any) {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNavBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Devices"
        component={DevicesScreen}
        options={{
          tabBarLabel: 'Search',
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarLabel: 'History',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        await checkProfileComplete();
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkProfileComplete = async () => {
    try {
      setCheckingProfile(true);
      const complete = await ProfileService.isProfileComplete();
      setProfileComplete(complete);
    } catch (error: any) {
      console.error('Profile check error:', error);
      // If it's a network error or auth error, don't crash - just set profile as incomplete
      setProfileComplete(false);
      // If it's a 401, user needs to login again
      if (error?.response?.status === 401) {
        setIsAuthenticated(false);
      }
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleLoginSuccess = async () => {
    setIsAuthenticated(true);
    await checkProfileComplete();
  };

  const handleOnboardingComplete = async () => {
    await checkProfileComplete();
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setIsAuthenticated(false);
    setProfileComplete(false);
  };

  if (isLoading || checkingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar
        hidden={true}
        translucent={true}
      />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login">
              {(props) => (
                <LoginScreen
                  {...props}
                  onLoginSuccess={handleLoginSuccess}
                  onNavigateToRegister={() => props.navigation.navigate('Register')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {(props) => (
                <RegisterScreen
                  {...props}
                  onRegisterSuccess={handleLoginSuccess}
                  onNavigateToLogin={() => props.navigation.navigate('Login')}
                />
              )}
            </Stack.Screen>
          </>
        ) : !profileComplete ? (
          <>
            <Stack.Screen name="Onboarding">
              {(props) => (
                <OnboardingScreen
                  {...props}
                  onComplete={() => props.navigation.navigate('GoalSelection')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="GoalSelection">
              {(props) => (
                <GoalSelectionScreen
                  {...props}
                  onComplete={handleOnboardingComplete}
                />
              )}
            </Stack.Screen>
          </>
        ) : (
          <>
          <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="Vitals" 
              component={VitalsScreen}
              options={{
                headerShown: true,
                title: 'AI Vital Signs',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="VitalSignsDetails" 
              component={VitalSignsDetailsScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="LifestylePrediction" 
              component={LifestylePredictionScreen}
              options={{
                headerShown: true,
                title: 'Lifestyle Predictions',
                headerBackTitle: 'Back',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

