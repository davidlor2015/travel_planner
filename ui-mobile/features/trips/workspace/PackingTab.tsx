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
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import { SectionCard } from "@/shared/ui/SectionCard";
import { TextInputField } from "@/shared/ui/TextInputField";

type Props = { tripId: number };

export function PackingTab({ tripId }: Props) {
  const packing = usePackingList(tripId);
  const [draft, setDraft] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);

  if (packing.loading) {
    return <ScreenLoading label="Loading packing list…" />;
  }

  if (packing.error) {
    return (
      <ScreenError
        message="We couldn't load the packing list. Try again in a moment."
        onRetry={() => void packing.reload?.()}
      />
    );
  }

  const checked = packing.items.filter((i) => i.checked).length;
  const total = packing.items.length;

  const handleAdd = async () => {
    if (!draft.trim()) return;
    try {
      setMutationError(null);
      await packing.addItem(draft.trim());
      setDraft("");
    } catch {
      setMutationError("We couldn't add that item. Try again.");
    }
  };

  const handleClearChecked = async () => {
    try {
      setMutationError(null);
      await packing.clearChecked();
    } catch {
      setMutationError("We couldn't clear your checked items. Try again.");
    }
  };

  const handleToggleItem = async (itemId: number) => {
    try {
      setMutationError(null);
      await packing.toggleItem(itemId);
    } catch {
      setMutationError("We couldn't update that item. Try again.");
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      setMutationError(null);
      await packing.removeItem(itemId);
    } catch {
      setMutationError("We couldn't remove that item. Try again.");
    }
  };

  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4">
      {mutationError ? (
        <View className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-3">
          <Text className="text-sm text-danger">{mutationError}</Text>
        </View>
      ) : null}
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
              <SecondaryButton
                label="Clear checked"
                onPress={() => void handleClearChecked()}
              />
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
            onToggle={() => void handleToggleItem(item.id)}
            onDelete={() => void handleRemoveItem(item.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
