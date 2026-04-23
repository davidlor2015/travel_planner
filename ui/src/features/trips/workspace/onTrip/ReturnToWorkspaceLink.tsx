export function ReturnToWorkspaceLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold text-accent underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      Full workspace
    </button>
  );
}

