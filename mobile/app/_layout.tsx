import { Stack, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useAuthStore } from './../store/authStore';
import { useEffect } from "react";

export default function RootLayout() {
  // const router = useRouter();
  // const segment = useSegments();

  // const {checkAuth, user, token} = useAuthStore()
  // useEffect(() => {
  //   checkAuth()
  // }, [])

  // // handle navigation
  // useEffect(() => {
  //   const isAuthScreen = segment[0] === "(auth)";
  //   const isSignedIn = user && token;

  //   if (!isSignedIn && !isAuthScreen) router.replace("/(auth)/login");
  //   else if (isSignedIn && isAuthScreen) router.replace("/(tabs)");

  // }, [user, token, segment])
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen 
          name="(auth)"
          options={{
            headerShown: false,
            presentation: 'modal'
          }}
        />
      </Stack>
      <StatusBar style="dark"/>
    </SafeAreaProvider>
  );
}
