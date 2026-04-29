// Path: ui-mobile/features/trips/onTrip/OnTripHeader.tsx
// Summary: Implements OnTripHeader module logic.

import { Pressable, Text, View } from "react-native";

import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";

type Member = { email: string; tone?: string };

type Props = {
  eyebrow: string;
  onBack: () => void;
  members?: Member[];
};

export function OnTripHeader({ eyebrow, onBack, members }: Props) {
  const visibleMembers = (members ?? []).slice(0, 4);

  return (
    <View
      className="flex-row items-center justify-between px-[22px] py-3"
      style={{ backgroundColor: DE.ivory, borderBottomWidth: 1, borderBottomColor: DE.rule }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={12}
        className="min-w-0 flex-1 flex-row items-center gap-2 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Back to trips"
      >
        <WaypointMark />
        <View className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: DE.clay }} />
        <Text
          className="min-w-0 flex-1"
          style={[
            fontStyles.monoMedium,
            { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: DE.muted },
          ]}
          numberOfLines={1}
        >
          {eyebrow}
        </Text>
      </Pressable>

      {visibleMembers.length > 1 ? (
        <View className="flex-row">
          {visibleMembers.map((m, i) => (
            <View key={i} style={{ marginLeft: i === 0 ? 0 : -7 }}>
              <MemberAvatar email={m.email} tone={m.tone} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function WaypointMark() {
  return (
    <View
      className="h-[14px] w-[14px] items-center justify-center rounded-full border"
      style={{ borderColor: DE.ink }}
    >
      <View className="h-[4px] w-[4px] rounded-full" style={{ backgroundColor: DE.ink }} />
    </View>
  );
}

function MemberAvatar({ email, tone }: { email: string; tone?: string }) {
  const initials = email.slice(0, 2).toUpperCase();
  return (
    <View
      className="h-[22px] w-[22px] items-center justify-center rounded-full"
      style={{
        backgroundColor: tone ?? DE.ink,
        borderWidth: 2,
        borderColor: DE.ivory,
      }}
    >
      <Text
        style={[fontStyles.uiSemibold, { fontSize: 8, color: DE.ivory }]}
      >
        {initials}
      </Text>
    </View>
  );
}
