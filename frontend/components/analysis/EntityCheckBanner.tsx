import React from 'react';
import { EntityCheck } from '../../types';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const EntityCheckBanner: React.FC<{ check: EntityCheck }> = ({ check }) => {
  const cfg = {
    confirmed: {
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
    },
    possible_mismatch: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      icon: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
    },
    mismatch_blocked: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
    },
  }[check.status];

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.icon}
      <span>
        <span className="font-bold">{check.resolvedName}</span>
        {' · '}
        {check.message}
        {check.resolvedDomain && (
          <a
            href={`https://${check.resolvedDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 underline opacity-70 hover:opacity-100"
          >
            {check.resolvedDomain}
          </a>
        )}
      </span>
      <span className="ml-auto text-xs opacity-60 flex-shrink-0">
        {Math.round(check.nameSimilarity * 100)}% name match
      </span>
    </div>
  );
};
