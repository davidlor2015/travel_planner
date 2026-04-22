export function ReturnToWorkspaceLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold text-[#B86845] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/40"
    >
      Full workspace
    </button>
  );
}

