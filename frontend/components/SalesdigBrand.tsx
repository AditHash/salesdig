import React from 'react';

interface BrandMarkProps {
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className = '' }) => (
  <img src="/salesdig-mark.svg" alt="" aria-hidden="true" className={className} />
);

export const SalesdigBrand: React.FC<{ compact?: boolean; className?: string }> = ({ compact = false, className = '' }) => (
  <div className={`flex min-w-0 items-center gap-3 ${className}`}>
    <BrandMark className="h-10 w-10 shrink-0" />
    {!compact && <span className="truncate text-xl font-extrabold tracking-tight text-slate-950">Salesdig</span>}
  </div>
);
