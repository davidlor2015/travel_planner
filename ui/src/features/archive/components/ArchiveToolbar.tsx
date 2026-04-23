import { SearchInput, ViewToggle } from "../../../shared/ui";
import type { ArchiveViewMode } from "../types";

interface ArchiveToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  view: ArchiveViewMode;
  onViewChange: (view: ArchiveViewMode) => void;
}

export function ArchiveToolbar({
  query,
  onQueryChange,
  view,
  onViewChange,
}: ArchiveToolbarProps) {
  return (
    <section
      aria-label="Archive filters"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <SearchInput
        value={query}
        onChange={onQueryChange}
        placeholder="Search past trips..."
        className="w-full sm:max-w-md"
      />

      <ViewToggle
        value={view}
        onChange={onViewChange}
        options={[
          { id: "grid", label: "Grid" },
          { id: "list", label: "List" },
        ]}
      />
    </section>
  );
}
