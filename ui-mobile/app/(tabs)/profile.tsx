import { View, Text } from "react-native";

import { useAuth } from "@/providers/AuthProvider";
import { PrimaryButton } from "@/shared/ui/Button";

function fallbackDisplayName(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return email;
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const email = user?.email ?? "";
  const displayName = user?.display_name?.trim() || (email ? fallbackDisplayName(email) : "Traveler");

  return (
    <View className="flex-1 justify-center bg-bg px-4">
      <View className="gap-4 rounded-[24px] border border-border bg-white px-5 py-5">
        <View className="gap-1">
          <Text className="text-[11px] uppercase tracking-[0.5px] text-text-soft">Profile</Text>
          <Text className="text-3xl font-semibold text-text">{displayName}</Text>
          {email ? <Text className="text-sm text-text-muted">{email}</Text> : null}
        </View>
        <PrimaryButton label="Sign out" onPress={() => void signOut()} fullWidth />
      </View>
    </View>
  );
}
