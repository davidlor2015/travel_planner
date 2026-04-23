import { CategoryChip } from "../../../shared/ui";
import type { DestinationMood } from "../types";

interface CategoryChipRowProps {
  moods: DestinationMood[];
  activeMood: DestinationMood | null;
  onMoodChange: (mood: DestinationMood | null) => void;
}

export function CategoryChipRow({
  moods,
  activeMood,
  onMoodChange,
}: CategoryChipRowProps) {
  return (
    <div
      className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
      role="group"
      aria-label="Destination moods"
    >
      <CategoryChip
        active={activeMood === null}
        onClick={() => onMoodChange(null)}
      >
        All
      </CategoryChip>
      {moods.map((mood) => (
        <CategoryChip
          key={mood}
          active={activeMood === mood}
          onClick={() => onMoodChange(activeMood === mood ? null : mood)}
        >
          {mood}
        </CategoryChip>
      ))}
    </div>
  );
}
