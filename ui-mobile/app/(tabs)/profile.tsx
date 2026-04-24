import { View, Text, Button } from "react-native";

import { useAuth } from "@/providers/AuthProvider";

export default function ProfilePage() {
  const { signOut } = useAuth();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Text>Profile</Text>
      <Button title="Sign out" onPress={() => void signOut()} />
    </View>
  );
}
