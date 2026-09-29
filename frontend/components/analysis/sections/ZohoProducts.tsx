import React from 'react';
import { AgentPartnerProductRecommendation } from '../../../types';
import { Boxes, Target, Zap, CheckCircle2, Layers } from 'lucide-react';

interface Props {
  recommendations: AgentPartnerProductRecommendation[];
}

const fitBar = (s: number) =>
  s >= 80 ? 'bg-emerald-500' : s >= 60 ? 'bg-amber-500' : 'bg-slate-400';

const fitBadge = (s: number) =>
  s >= 80
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : s >= 60
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-slate-100 text-slate-600 border-slate-200';

export const ZohoProducts: React.FC<Props> = ({ recommendations }) => {
  const recs = [...(recommendations ?? [])].sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));

  if (!recs.length)
    return (
      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
        <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-semibold">No partner products mapped for this profile yet.</p>
        <p className="text-slate-400 text-sm mt-1">Regenerate the analysis to map configured products to this company.</p>
      </section>
    );

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 bg-rose-50 rounded-lg">
          <Boxes className="w-4 h-4 text-rose-600" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Recommended Partner Products</h2>
        <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
          {recs.length} mapped
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {recs.map((rec, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-rose-300 hover:shadow-lg transition-all group"
          >
            <div className="flex h-full">
              <div className={`w-1.5 flex-shrink-0 ${fitBar(rec.fitScore)}`} />
              <div className="flex-1 p-5">
                {/* Title row */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900 text-base group-hover:text-rose-700 transition-colors">
                      {rec.productName}
                    </h3>
                    {rec.category && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                        <Layers className="w-3 h-3" />
                        {rec.category}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-black px-2.5 py-1 rounded-full border flex items-center gap-1 flex-shrink-0 ${fitBadge(
                      rec.fitScore
                    )}`}
                  >
                    <Zap className="w-3 h-3" />
                    Fit {rec.fitScore}
                  </span>
                </div>

                {rec.reason && (
                  <p className="text-sm text-slate-500 leading-relaxed mb-3">{rec.reason}</p>
                )}

                {rec.mappedNeed && (
                  <div className="flex items-start gap-2 mb-3">
                    <Target className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 uppercase tracking-wide">Addresses: </span>
                      <span className="text-slate-600">{rec.mappedNeed}</span>
                    </div>
                  </div>
                )}

                {rec.useCase && (
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 mb-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="w-3 h-3 text-indigo-500" />
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                        Use Case
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rec.useCase}</p>
                  </div>
                )}

                {rec.customerValue && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold text-emerald-700 uppercase tracking-wide">Customer Value: </span>
                      <span className="text-slate-700 font-semibold">{rec.customerValue}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
