import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";

function TabsLayoutInner() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1C1108",
        tabBarInactiveTintColor: "#8A7E74",
        tabBarStyle: {
          backgroundColor: "#FEFCF9",
          borderTopColor: "#EAE2D6",
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          letterSpacing: 0.2,
        },
      }}
    >
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
        name="explore"
        options={
          process.env.EXPO_PUBLIC_ENABLE_EXPLORE === "true"
            ? {
                title: "Explore",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="compass-outline" size={size} color={color} />
                ),
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Companions is hidden from primary nav for V1; feature code preserved in features/matching/ */}
      <Tabs.Screen
        name="companions"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: "Memories",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="albums-outline" size={size} color={color} />
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
