import React from 'react';
import { AgentSalesPotential } from '../../../types';
import { Target } from 'lucide-react';

const Bar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <span className={`text-xs font-black ${color}`}>{value}</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

export const SalesPotential: React.FC<{ potential: AgentSalesPotential }> = ({ potential }) => (
  <section className="space-y-4">
    <div className="flex items-center gap-2 mb-1">
      <div className="p-2 bg-emerald-50 rounded-lg"><Target className="w-4 h-4 text-emerald-600" /></div>
      <h2 className="text-lg font-black text-slate-900">Sales Opportunity Potential</h2>
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-4 mb-5">
        <div className="text-center">
          <p className="text-4xl font-black text-emerald-600">{potential.overall}</p>
          <p className="text-[11px] text-slate-400 uppercase tracking-widest">Overall Score</p>
        </div>
        <div className="h-12 w-px bg-slate-200" />
        <p className="text-sm text-slate-600 leading-relaxed flex-1">{potential.summary}</p>
      </div>
      <div className="space-y-3">
        <Bar label="Cloud Migration" value={potential.cloudMigration} color="text-blue-600" />
        <Bar label="GenAI Adoption" value={potential.genAi} color="text-cyan-600" />
        <Bar label="Modernization" value={potential.modernization} color="text-amber-500" />
        {typeof (potential.partnerProducts ?? potential.zoho) === 'number' && (
          <Bar label="Partner Product Fit" value={(potential.partnerProducts ?? potential.zoho)!} color="text-rose-600" />
        )}
      </div>
    </div>
  </section>
);
