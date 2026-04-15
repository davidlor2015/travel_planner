/**
 * Generates the base class string for all text inputs, textareas, and selects.
 * Import and call in any component that renders a form control.
 */
export const inputCls = (hasError?: boolean) =>
  [
    'w-full px-4 py-2.5 rounded-xl border text-sm text-espresso bg-white',
    'placeholder:text-muted',
    'focus:outline-none focus:ring-2 focus:ring-amber/35 focus:border-amber',
    'transition-all duration-200',
    hasError
      ? 'border-danger focus:ring-danger/30 focus:border-danger'
      : 'border-smoke',
  ].join(' ');
