export const inputCls = (hasError?: boolean) =>
  [
    'w-full px-4 py-3 rounded-xl border text-sm bg-white',
    'focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber',
    'transition-all duration-150',
    hasError ? 'border-danger focus:ring-danger/30 focus:border-danger' : 'border-smoke',
  ].join(' ');
