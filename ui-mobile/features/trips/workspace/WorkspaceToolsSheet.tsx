import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

import { BudgetTab } from "./BudgetTab";
import { PackingTab } from "./PackingTab";
import { ReservationsTab } from "./ReservationsTab";

type ToolTab = "budget" | "packing" | "reservations";

type Props = {
  tripId: number;
  visible: boolean;
  onClose: () => void;
};

const TOOL_TABS: Array<{ id: ToolTab; label: string }> = [
  { id: "budget", label: "Budget" },
  { id: "packing", label: "Packing" },
  { id: "reservations", label: "Bookings" },
];

export function WorkspaceToolsSheet({ tripId, visible, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ToolTab>("budget");

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="h-[86%] rounded-t-[28px] bg-bg-app pb-4 pt-3">
          <View className="items-center">
            <View className="h-1.5 w-12 rounded-full bg-border" />
          </View>

          <View className="mt-3 flex-row items-center justify-between px-4">
            <Text className="text-[32px] text-text" style={fontStyles.displaySemibold}>
              Trip tools
            </Text>
            <Pressable onPress={onClose} className="rounded-full border border-border bg-white px-3 py-1.5">
              <Text className="text-sm font-semibold text-text-muted">Close</Text>
            </Pressable>
          </View>

          <View className="mt-3 flex-row gap-2 px-4">
            {TOOL_TABS.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  className={[
                    "rounded-full border px-3 py-1.5",
                    active ? "border-text bg-text" : "border-border bg-white",
                  ].join(" ")}
                >
                  <Text
                    className={[
                      "text-sm font-semibold",
                      active ? "text-white" : "text-text-muted",
                    ].join(" ")}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-2 flex-1">
            {activeTab === "budget" ? <BudgetTab tripId={tripId} /> : null}
            {activeTab === "packing" ? <PackingTab tripId={tripId} /> : null}
            {activeTab === "reservations" ? <ReservationsTab tripId={tripId} /> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
