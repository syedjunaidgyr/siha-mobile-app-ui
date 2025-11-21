import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, Clock4, UserRound, Scan } from 'lucide-react-native';
import { Colors } from '../../theme/colors';

const TAB_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Dashboard: Home,
  Devices: Search,
  Appointments: Clock4,
  Profile: UserRound,
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export function BottomNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const parentNav = navigation.getParent();

  const handleCenterAction = () => {
    if (parentNav?.navigate) {
      parentNav.navigate('Vitals');
    } else {
      navigation.navigate('Vitals' as never);
    }
  };

  const renderTab = (route: typeof state.routes[number], index: number) => {
    const isFocused = state.index === index;
    const options = descriptors[route.key].options;
    const label = (options.tabBarLabel as string) ?? options.title ?? route.name;
    const IconComponent = TAB_ICON_MAP[route.name] ?? Home;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.tabButton}
      >
        <IconComponent size={22} color={isFocused ? Colors.accent : Colors.textMuted} />
        <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const leftRoutes = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.tabCluster}>
          {leftRoutes.map((route, index) => renderTab(route, index))}
        </View>
        <View style={styles.spacer} />
        <View style={styles.tabCluster}>
          {rightRoutes.map((route, index) => renderTab(route, index + leftRoutes.length))}
        </View>
        <View style={styles.homeIndicator} />
      </View>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.centerButton}
        onPress={handleCenterAction}
      >
        <Scan size={26} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  container: {
    width: SCREEN_WIDTH - 24,
    backgroundColor: Colors.card,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabCluster: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    gap: 12,
  },
  spacer: {
    width: 80,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: Colors.accent,
  },
  centerButton: {
    position: 'absolute',
    bottom: 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: Colors.card,
    shadowColor: Colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    left: '25%',
    right: '25%',
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    opacity: 0.3,
  },
});


