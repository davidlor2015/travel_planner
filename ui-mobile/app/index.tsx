import { Redirect } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";

export default function IndexPage() {
  const { isHydrating, isAuthenticated } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/trips" />;
  }

  return <Redirect href="/(auth)/login" />;
}
