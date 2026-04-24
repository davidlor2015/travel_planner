import { Redirect, Tabs } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";

export default function TabsLayout() {
  const { isHydrating, isAuthenticated } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="trips"
        options={{
          title: "Trips",
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: "Active",
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}
