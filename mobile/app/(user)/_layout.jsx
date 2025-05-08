import { View, Text } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isAdmin, user } = useAuthStore();

  if (!user) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        headerTitleStyle:{
          color: COLORS.textPrimary,
          fontWeight: 600,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: COLORS.cardBackground,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingTop: 5,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen 
        name="index"
        options={{ 
          title: "Trang Chủ",
          tabBarIcon: ({color, size}) => (
            <Ionicons name="home" size={size} color={color}/>
          ),
        }} 
      />

      <Tabs.Screen 
        name="cart"
        options={{ 
          title: "Giỏ Hàng",
          tabBarIcon: ({color, size}) => (
            <Ionicons name="cart" size={size} color={color}/>
          ),
        }}
      />

      <Tabs.Screen 
        name="order"
        options={{ 
          title: "Đơn Hàng",
          tabBarIcon: ({color, size}) => (
            <Ionicons name="receipt" size={size} color={color}/>
          ),
        }}
      />
      
      <Tabs.Screen
        name="setting"
        options={{ 
          title: "Cài đặt",
          tabBarIcon: ({color, size}) => (
            <FontAwesome name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
