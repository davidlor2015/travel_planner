import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
} from "react-native";

import { PackingItemRow } from "@/features/trips/packing/PackingItemRow";
import { usePackingList } from "@/features/trips/packing/hooks";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import { SectionCard } from "@/shared/ui/SectionCard";
import { TextInputField } from "@/shared/ui/TextInputField";

type Props = { tripId: number };

export function PackingTab({ tripId }: Props) {
  const packing = usePackingList(tripId);
  const [draft, setDraft] = useState("");

  if (packing.loading) {
    return <ScreenLoading label="Loading packing list…" />;
  }

  if (packing.error) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-center text-[#c62828]">{packing.error}</Text>
      </View>
    );
  }

  const checked = packing.items.filter((i) => i.checked).length;
  const total = packing.items.length;

  const handleAdd = async () => {
    if (!draft.trim()) return;
    try {
      await packing.addItem(draft.trim());
      setDraft("");
    } catch {}
  };

  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4">
      {total > 0 && (
        <SectionCard eyebrow="Progress" title="Packing status">
          <View className="flex-row items-center justify-between">
            <View>
              <View className="h-2 w-48 overflow-hidden rounded-full bg-border">
                <View
                  className="h-full rounded-full bg-olive"
                  style={{ width: `${total === 0 ? 0 : Math.round((checked / total) * 100)}%` }}
                />
              </View>
            </View>
            {checked > 0 ? (
              <SecondaryButton label="Clear checked" onPress={() => void packing.clearChecked()} />
            ) : null}
          </View>
        </SectionCard>
      )}

      <SectionCard
        eyebrow="Add item"
        title="Packing list"
        description="Use this list for real trip execution, not a generic shopping checklist."
      >
        <View className="gap-3">
        <TextInputField
          label="Item"
          placeholder="Add item"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => void handleAdd()}
          returnKeyType="done"
        />
        <PrimaryButton label="Add item" onPress={() => void handleAdd()} fullWidth />
        </View>
      </SectionCard>

      {total === 0 && (
        <EmptyState
          title="No packing items yet"
          message="Add items tied to this trip so the mobile client is useful during prep and while traveling."
        />
      )}

      <View className="gap-2">
        {packing.items.map((item) => (
          <PackingItemRow
            key={item.id}
            item={item}
            onToggle={() => void packing.toggleItem(item.id)}
            onDelete={() => void packing.removeItem(item.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
