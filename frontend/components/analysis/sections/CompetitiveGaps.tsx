import React from 'react';
import { AgentCompetitorGap } from '../../../types';
import { Swords, AlertTriangle, Zap, Target } from 'lucide-react';

export const CompetitiveGaps: React.FC<{ gaps: AgentCompetitorGap[] }> = ({ gaps }) => (
  <section className="space-y-4">
    <div className="flex items-center gap-2 mb-1">
      <div className="p-2 bg-rose-50 rounded-lg"><Swords className="w-4 h-4 text-rose-500" /></div>
      <h2 className="text-lg font-black text-slate-900">Competitive Gaps</h2>
    </div>
    {gaps.length === 0
      ? <p className="text-sm text-slate-400 italic">No competitive data available</p>
      : <div className="space-y-4">
        {gaps.map((g, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all">
            {/* Competitor header */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="font-black text-slate-900 text-sm">{g.competitorName}</span>
              </div>
              {/* Domain advantages */}
              {g.domainAdvantages?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {g.domainAdvantages.map((d, j) => (
                    <div key={j} className="group relative">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-default">
                        {d.domain}
                      </span>
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-10 w-64 bg-slate-900 text-white text-xs rounded-lg p-2.5 leading-relaxed shadow-xl">
                        <span className="font-bold text-indigo-300">{d.domain}: </span>{d.advantage}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Domain advantages expanded list */}
            {g.domainAdvantages?.length > 0 && (
              <div className="px-5 pt-4 pb-0 space-y-2">
                {g.domainAdvantages.map((d, j) => (
                  <div key={j} className="flex gap-2 text-sm">
                    <span className="font-bold text-indigo-600 min-w-[120px] text-[11px] uppercase tracking-wide pt-0.5">{d.domain}</span>
                    <span className="text-slate-600 leading-relaxed">{d.advantage}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pain */}
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-[11px] font-bold text-rose-700 uppercase tracking-widest">Pain Point</span>
                  </div>
                  <p className="text-sm text-rose-900 leading-relaxed">"{g.customerGap}"</p>
                </div>
                {/* Fix */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest">Innovation Fix</span>
                  </div>
                  <p className="text-sm text-slate-800 font-semibold leading-relaxed">{g.proposedInnovation}</p>
                  <div className="mt-3 pt-3 border-t border-indigo-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Deploy:</span>
                    <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">{g.workmatesService}</span>
                  </div>
                </div>
                {/* Value */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">Business Value</span>
                  </div>
                  <p className="text-sm text-emerald-900 font-semibold leading-relaxed">{g.valueProposition}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>}
  </section>
);
