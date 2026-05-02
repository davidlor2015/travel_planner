// Path: ui-mobile/features/trips/onTrip/OnTripHeader.tsx
// Summary: Implements OnTripHeader module logic.

import { Pressable, Text, View } from "react-native";

import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";
import { RoenMark } from "@/shared/ui/RoenLogo";

type Member = { email: string; tone?: string };

type Props = {
  eyebrow: string;
  dateLabel?: string | null;
  onBack: () => void;
  members?: Member[];
};

export function OnTripHeader({ eyebrow, dateLabel, onBack, members }: Props) {
  const visibleMembers = (members ?? []).slice(0, 4);

  return (
    <View
      className="flex-row items-center px-[22px] py-3"
      style={{ backgroundColor: DE.ivory, borderBottomWidth: 1, borderBottomColor: DE.rule }}
    >
      {/* Left/right flex 1 vs center flex 2 — wider center lane so TODAY line stays single-line */}
      <View className="min-w-0 flex-1 flex-row items-center justify-start">
        <Pressable
          onPress={onBack}
          hitSlop={16}
          className="active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Back to trips"
        >
          <RoenMark size={24} />
        </Pressable>
      </View>

      {/* Center: absorbs more width than rails (flex-2) so kicker stays on one row */}
      <View className="min-w-0 flex-[2] items-center px-1" style={{ gap: 3 }}>
        <Text
          style={[
            fontStyles.monoMedium,
            {
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: DE.muted,
              textAlign: "center",
            },
          ]}
          numberOfLines={1}
        >
          {eyebrow}
        </Text>
        {dateLabel ? (
          <Text
            style={[
              fontStyles.monoRegular,
              {
                fontSize: 9.5,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: DE.mutedLight,
                textAlign: "center",
              },
            ]}
            numberOfLines={1}
          >
            {dateLabel}
          </Text>
        ) : null}
      </View>

      <View className="min-w-0 flex-1 flex-row items-center justify-end">
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
      <Text style={[fontStyles.uiSemibold, { fontSize: 8, color: DE.ivory }]}>
        {initials}
      </Text>
    </View>
  );
}
