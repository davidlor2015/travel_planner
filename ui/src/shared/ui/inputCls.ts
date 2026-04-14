export const inputCls = (hasError?: boolean) =>
  [
    'w-full px-4 py-3 rounded-xl border text-sm bg-white',
    'focus:outline-none focus:ring-2 focus:ring-ocean/40 focus:border-ocean',
    'transition-all duration-150',
    hasError ? 'border-coral focus:ring-coral/30 focus:border-coral' : 'border-gray-200',
  ].join(' ');
