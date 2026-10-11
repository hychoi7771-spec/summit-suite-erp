import type { ElementType } from 'react';
import { cn } from '@/lib/utils';

interface NavGlyphProps {
  icon: ElementType;
  active?: boolean;
  className?: string;
  tone?: 'primary' | 'info' | 'warning';
}

/** A decorative SVG badge; the containing link supplies its accessible name. */
export function NavGlyph({ icon: Icon, active = false, className, tone = 'primary' }: NavGlyphProps) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"
      className={cn('nav-glyph shrink-0', `nav-glyph-${tone}`, active && 'nav-glyph-active', className)}>
      <rect className="nav-glyph-base" x="5" y="7" width="30" height="30" rx="10" />
      <rect className="nav-glyph-face" x="5" y="3" width="30" height="30" rx="10" />
      <Icon className="nav-glyph-symbol" x="11" y="9" width="18" height="18" strokeWidth="2.5" />
      <path className="nav-glyph-spark" d="M34 1v6M31 4h6M2 27v4M0 29h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}