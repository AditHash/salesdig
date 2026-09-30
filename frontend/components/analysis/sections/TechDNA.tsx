import React from 'react';
import { AgentTechStack } from '../../../types';
import { Cpu } from 'lucide-react';

const categoryColor = (cat: string) => {
  const c = cat.toLowerCase();
  if (c.includes('cloud') || c.includes('infra')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (c.includes('data') || c.includes('analytic')) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
  if (c.includes('ai') || c.includes('ml')) return 'bg-pink-50 text-pink-700 border-pink-200';
  if (c.includes('dev') || c.includes('ops') || c.includes('ci')) return 'bg-orange-50 text-orange-700 border-orange-200';
  if (c.includes('security') || c.includes('compliance')) return 'bg-red-50 text-red-700 border-red-200';
  if (c.includes('database') || c.includes('storage')) return 'bg-teal-50 text-teal-700 border-teal-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

export const TechDNA: React.FC<{ techStack: AgentTechStack[] }> = ({ techStack }) => (
  <section className="space-y-4">
    <div className="flex items-center gap-2 mb-1">
      <div className="p-2 bg-teal-50 rounded-lg"><Cpu className="w-4 h-4 text-teal-600" /></div>
      <h2 className="text-lg font-black text-slate-900">Technology DNA</h2>
    </div>
    {techStack.length === 0
      ? <p className="text-sm text-slate-400 italic">Technology stack not disclosed</p>
      : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {techStack.map((stack, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-teal-300 hover:shadow-md transition-all">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">{stack.category}</p>
            <div className="flex flex-wrap gap-1.5">
              {(stack.details ?? '').split(',').map((tech, j) => (
                <span key={j} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${categoryColor(stack.category)}`}>
                  {tech.trim()}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>}
  </section>
);
