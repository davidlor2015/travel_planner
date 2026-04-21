import { SearchInput } from "../../../shared/ui";

interface DestinationSearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export function DestinationSearchBar({
  query,
  onQueryChange,
}: DestinationSearchBarProps) {
  return (
    <div className="mx-auto mt-8 max-w-2xl">
      <SearchInput
        value={query}
        onChange={onQueryChange}
        placeholder="Search destination, region, or trip idea..."
      />
    </div>
  );
}
