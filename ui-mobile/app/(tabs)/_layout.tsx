import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";

const ENABLE_EXPLORE = process.env.EXPO_PUBLIC_ENABLE_EXPLORE === "true";

function TabsLayoutInner() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="trips"
        options={{
          title: "Trips",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="companions"
        options={{
          title: "Companions",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: "Archive",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="archive-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Explore: hidden by default, enabled via EXPO_PUBLIC_ENABLE_EXPLORE=true */}
      <Tabs.Screen
        name="explore"
        options={ENABLE_EXPLORE ? {
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        } : { href: null }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  const { isHydrating, isAuthenticated } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <TabsLayoutInner />;
}
