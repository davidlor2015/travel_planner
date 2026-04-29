// Path: ui/src/features/trips/list/tripListIcons.tsx
// Summary: Implements tripListIcons module logic.

/**
 * Small stroke icons used only by the TripList feature (picker + empty states).
 * If these appear elsewhere, promote them to `shared/ui` and import from there.
 */
type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

const IconBase = ({
  size = 16,
  children,
  ...props
}: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const PlusIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </IconBase>
);

export const BellIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </IconBase>
);
