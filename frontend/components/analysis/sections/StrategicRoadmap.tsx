import React from 'react';
import { AgentStrategy } from '../../../types';
import { ShieldCheck, TrendingUp, Map, CheckCircle2 } from 'lucide-react';

export const StrategicRoadmap: React.FC<{ strategy: AgentStrategy }> = ({ strategy }) => {
  const resolutions = strategy?.resolutions ?? [];
  const roadmap = strategy?.roadmap ?? [];
  if (!resolutions.length && !roadmap.length) return (
    <p className="text-sm text-slate-400 italic">No strategic roadmap available</p>
  );
  return (
    <section className="space-y-8">
      {/* Strategic Resolutions */}
      {resolutions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 rounded-lg"><ShieldCheck className="w-4 h-4 text-emerald-600" /></div>
            <h2 className="text-lg font-black text-slate-900">Strategic Resolutions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resolutions.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-emerald-300 hover:shadow-md transition-all group">
                <div className="bg-slate-50 border-b border-slate-100 px-5 py-3">
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-teal-700 uppercase tracking-wide">
                    {r.workmatesService}
                  </span>
                  <p className="text-sm font-bold text-slate-800 mt-2">{r.painPoint}</p>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">{r.solutionStrategy}</p>
                  <div className="flex items-start gap-2 pt-3 border-t border-slate-100">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-bold text-emerald-700">{r.businessImpact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cloud Adoption Timeline */}
      {roadmap.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 rounded-lg"><Map className="w-4 h-4 text-teal-600" /></div>
            <h2 className="text-lg font-black text-slate-900">Cloud Adoption Timeline</h2>
          </div>

          {/* Desktop: horizontal stepper */}
          <div className="hidden md:block relative">
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-slate-200 mx-8" />
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${roadmap.length}, 1fr)` }}>
              {roadmap.map((phase, i) => (
                <div key={i} className="relative z-10 flex flex-col">
                  {/* Step dot */}
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white border-2 border-teal-300 flex flex-col items-center justify-center shadow-md">
                      <span className="text-[10px] font-bold text-teal-400 uppercase">Phase</span>
                      <span className="text-xl font-black text-teal-600">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 flex-1 hover:border-teal-300 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">{phase.duration}</span>
                    </div>
                    <h4 className="font-black text-slate-900 text-sm mb-1">{phase.phaseName}</h4>
                    <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wide mb-3">{phase.focusArea}</p>
                    <ul className="space-y-1.5 mb-4">
                      {phase.activities.map((a, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <span className="w-1 h-1 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />{a}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-3 border-t border-slate-100 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-bold text-emerald-700">{phase.outcome}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: vertical */}
          <div className="md:hidden space-y-3">
            {roadmap.map((phase, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  {i < roadmap.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-2" />}
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex-1 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-slate-900 text-sm">{phase.phaseName}</h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">{phase.duration}</span>
                  </div>
                  <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wide mb-2">{phase.focusArea}</p>
                  <ul className="space-y-1 mb-3">
                    {phase.activities.map((a, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <span className="w-1 h-1 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />{a}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-start gap-1.5 pt-2 border-t border-slate-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-bold text-emerald-700">{phase.outcome}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
