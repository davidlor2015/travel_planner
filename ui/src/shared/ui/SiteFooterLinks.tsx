// Path: ui/src/shared/ui/SiteFooterLinks.tsx
// Summary: Implements SiteFooterLinks module logic.

import { Link } from 'react-router-dom';

interface SiteFooterLinksProps {
  className?: string;
}

export const SiteFooterLinks = ({ className }: SiteFooterLinksProps) => (
  <div className={className ?? 'flex flex-wrap items-center justify-center gap-x-4 gap-y-2'}>
    <Link to="/privacy" className="text-xs font-medium text-flint hover:text-espresso hover:underline">
      Privacy
    </Link>
    <Link to="/terms" className="text-xs font-medium text-flint hover:text-espresso hover:underline">
      Terms
    </Link>
    <Link to="/support" className="text-xs font-medium text-flint hover:text-espresso hover:underline">
      Contact
    </Link>
  </div>
);
