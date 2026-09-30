import React from 'react';
import { AgentGenAiOpportunity } from '../../../types';
import { Lightbulb } from 'lucide-react';

const catColor = (cat: string) => {
  const c = cat.toLowerCase();
  if (c.includes('automat')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (c.includes('security') || c.includes('compliance')) return 'bg-red-100 text-red-700 border-red-200';
  if (c.includes('data') || c.includes('analytic')) return 'bg-cyan-100 text-cyan-700 border-cyan-200';
  if (c.includes('customer') || c.includes('cx')) return 'bg-pink-100 text-pink-700 border-pink-200';
  if (c.includes('cost') || c.includes('optim')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

export const GenAiOpportunities: React.FC<{ opportunities: AgentGenAiOpportunity[] }> = ({ opportunities }) => {
  if (!opportunities?.length) return (
    <p className="text-sm text-slate-400 italic">No GenAI opportunities identified</p>
  );
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 bg-amber-50 rounded-lg"><Lightbulb className="w-4 h-4 text-amber-500" /></div>
        <h2 className="text-lg font-black text-slate-900">GenAI Opportunities</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {opportunities.map((op, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-black text-slate-900 text-sm leading-snug">{op.title}</h3>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${catColor(op.category)}`}>
                {op.category}
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">{op.description}</p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Example</p>
              <p className="text-xs text-slate-700 italic">{op.example}</p>
            </div>
            <div className="flex items-start gap-2 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest flex-shrink-0">Value:</span>
              <p className="text-xs font-semibold text-emerald-800">{op.businessValue}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
