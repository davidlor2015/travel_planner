import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useSegments } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";

function shouldHideTabBar(segments: string[]): boolean {
  const tripsIndex = segments.findIndex((segment) => segment === "trips");
  if (tripsIndex === -1) return false;

  const childSegments = segments
    .slice(tripsIndex + 1)
    .filter((segment) => segment !== "index");

  return childSegments.length > 0;
}

function TabsLayoutInner() {
  const segments = useSegments();
  const tabBarHidden = shouldHideTabBar(segments);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabBarHidden ? { display: "none" } : undefined,
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
      {/* Explore stays routed but hidden until the mobile slice is ready. */}
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
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
