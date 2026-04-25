import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { buildProfileCompleteness, formatMatchingLabel } from "./adapters";
import { MatchList } from "./MatchList";
import { TravelProfileForm } from "./TravelProfileForm";
import { useCompanionsScreen } from "./useCompanionsScreen";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import type { TravelProfile } from "./api";

function ErrorBanner({ message }: { message: string }) {
  return (
    <View className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3">
      <Text style={fontStyles.uiSemibold} className="text-[13px] text-red-600">
        Something needs attention
      </Text>
      <Text style={fontStyles.uiRegular} className="mt-1 text-[12px] leading-4 text-red-500">
        {message}
      </Text>
    </View>
  );
}

function OnboardingCard({
  icon,
  title,
  body,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
}) {
  return (
    <View className="rounded-[18px] border border-smoke bg-white px-4 py-4">
      <View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-amber/10">
        <Ionicons name={icon} size={19} color="#B86845" />
      </View>
      <Text style={fontStyles.uiSemibold} className="text-[14px] text-espresso">
        {title}
      </Text>
      <Text style={fontStyles.uiRegular} className="mt-1 text-[13px] leading-5 text-muted">
        {body}
      </Text>
    </View>
  );
}

function NoProfileIntro() {
  return (
    <View className="gap-3">
      <View className="rounded-[24px] border border-smoke bg-parchment/70 px-5 py-5">
        <Text style={textScaleStyles.displayL} className="text-espresso">
          Find compatible travelers
        </Text>
        <Text style={fontStyles.uiRegular} className="mt-2 text-[14px] leading-5 text-muted">
          Matching compares real trip context: destination, dates, travel style, budget,
          interests, and preferred group size.
        </Text>
      </View>
      <View className="gap-3">
        <OnboardingCard
          icon="map-outline"
          title="Trip anchored"
          body="Requests start from one of your trips, so every match is grounded in a destination and travel window."
        />
        <OnboardingCard
          icon="analytics-outline"
          title="Compatibility first"
          body="Scores focus on planning fit and shared expectations, not a social feed."
        />
        <OnboardingCard
          icon="shield-checkmark-outline"
          title="You control visibility"
          body="Keep your profile hidden until you want trips to participate in discovery."
        />
      </View>
    </View>
  );
}

function ProfileSummary({
  profile,
  onEdit,
}: {
  profile: TravelProfile;
  onEdit: () => void;
}) {
  const completeness = buildProfileCompleteness(profile);

  return (
    <View className="rounded-[24px] border border-smoke bg-white px-4 py-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text style={fontStyles.uiSemibold} className="text-[17px] text-espresso">
            Your matching profile
          </Text>
          <Text style={fontStyles.uiRegular} className="mt-1 text-[13px] leading-5 text-muted">
            These preferences rank companion matches for trip planning fit.
          </Text>
        </View>
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel="Edit matching profile"
          className="active:opacity-70"
        >
          <View className="rounded-full bg-amber px-3.5 py-2">
            <Text style={fontStyles.uiSemibold} className="text-[12px] text-white">
              Edit
            </Text>
          </View>
        </Pressable>
      </View>

      <View className="mt-4 rounded-[18px] border border-smoke bg-parchment/70 px-4 py-4">
        <View className="flex-row items-center justify-between gap-3">
          <View>
            <Text style={fontStyles.uiSemibold} className="text-[11px] uppercase tracking-[1.2px] text-flint">
              Profile quality
            </Text>
            <Text style={fontStyles.uiSemibold} className="mt-1 text-[16px] text-espresso">
              {completeness.score}% complete
            </Text>
          </View>
          <View
            className={[
              "rounded-full border px-3 py-1.5",
              profile.is_discoverable
                ? "border-olive/20 bg-olive/10"
                : "border-smoke bg-white",
            ].join(" ")}
          >
            <Text
              style={fontStyles.uiSemibold}
              className={[
                "text-[11px]",
                profile.is_discoverable ? "text-olive" : "text-flint",
              ].join(" ")}
            >
              {profile.is_discoverable ? "Discoverable" : "Hidden"}
            </Text>
          </View>
        </View>

        <View className="mt-3 h-2 overflow-hidden rounded-full border border-smoke bg-white">
          <View className="h-full rounded-full bg-amber" style={{ width: `${completeness.score}%` }} />
        </View>

        <View className="mt-4 flex-row flex-wrap gap-2">
          <View className="rounded-full border border-smoke bg-white px-3 py-1.5">
            <Text style={fontStyles.uiMedium} className="text-[12px] text-flint">
              {formatMatchingLabel(profile.travel_style)}
            </Text>
          </View>
          <View className="rounded-full border border-smoke bg-white px-3 py-1.5">
            <Text style={fontStyles.uiMedium} className="text-[12px] text-flint">
              {formatMatchingLabel(profile.budget_range)}
            </Text>
          </View>
          <View className="rounded-full border border-smoke bg-white px-3 py-1.5">
            <Text style={fontStyles.uiMedium} className="text-[12px] text-flint">
              {profile.group_size_min}-{profile.group_size_max} travelers
            </Text>
          </View>
        </View>

        {profile.interests.length > 0 ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <View key={interest} className="rounded-full bg-olive/10 px-3 py-1.5">
                <Text style={fontStyles.uiMedium} className="text-[12px] text-olive">
                  {interest}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function CompanionsScreen() {
  const model = useCompanionsScreen();
  const hasProfile = Boolean(model.profile);
  const shouldShowLoading =
    model.profileIsLoading ||
    (hasProfile && (model.requestsIsLoading || model.tripsIsLoading));

  if (shouldShowLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <ScreenLoading label="Loading companions…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pb-1 pt-4">
          <Text style={textScaleStyles.displayL} className="text-espresso">
            Companions
          </Text>
          <Text style={fontStyles.uiRegular} className="mt-0.5 text-[13px] text-muted">
            Find planning-compatible travelers
          </Text>
        </View>

        <View className="mt-4 gap-5">
          {model.profileError ? <ErrorBanner message={model.profileError} /> : null}
          {model.requestsError ? <ErrorBanner message={model.requestsError} /> : null}
          {model.tripsError ? <ErrorBanner message={model.tripsError} /> : null}
          {model.upsertError ? <ErrorBanner message={model.upsertError} /> : null}

          {model.profile ? (
            model.isEditingProfile ? (
              <View className="rounded-[24px] border border-smoke bg-white px-4 py-4">
                <View className="mb-4 flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text style={fontStyles.uiSemibold} className="text-[17px] text-espresso">
                      Edit matching profile
                    </Text>
                    <Text style={fontStyles.uiRegular} className="mt-1 text-[13px] leading-5 text-muted">
                      Update the signals used to score companion fit.
                    </Text>
                  </View>
                </View>
                <TravelProfileForm
                  profile={model.profile}
                  onSubmit={model.handleUpsertProfile}
                  onCancel={() => model.setIsEditingProfile(false)}
                  isSaving={model.isSavingProfile}
                />
              </View>
            ) : (
              <ProfileSummary
                profile={model.profile}
                onEdit={() => model.setIsEditingProfile(true)}
              />
            )
          ) : (
            <>
              <NoProfileIntro />
              <View className="rounded-[24px] border border-smoke bg-white px-4 py-4">
                <View className="mb-4">
                  <Text style={fontStyles.uiSemibold} className="text-[17px] text-espresso">
                    Set up matching profile
                  </Text>
                  <Text style={fontStyles.uiRegular} className="mt-1 text-[13px] leading-5 text-muted">
                    You can edit this later before opening trip requests.
                  </Text>
                </View>
                <TravelProfileForm
                  profile={null}
                  onSubmit={model.handleUpsertProfile}
                  isSaving={model.isSavingProfile}
                />
              </View>
            </>
          )}

          {model.profile ? (
            <MatchList
              requests={model.requests}
              tripsById={model.tripsById}
              eligibleTrips={model.eligibleTrips}
              selectedTripId={model.selectedTripId}
              onSelectTrip={model.setSelectedTripId}
              onOpenRequest={model.handleOpenRequest}
              onCloseRequest={model.handleCloseRequest}
              openRequestCount={model.openRequestCount}
              closedRequestCount={model.closedRequestCount}
              isOpeningRequest={model.isOpeningRequest}
              isClosingRequest={model.isClosingRequest}
              openRequestError={model.openRequestError}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
