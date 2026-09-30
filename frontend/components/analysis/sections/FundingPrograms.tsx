import React, { useState } from 'react';
import { AgentFundingRecommendation } from '../../../types';
import { Sparkles, Users, Briefcase, Mail, Copy, Check, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { AWS_FUNDING_PROGRAMS } from '../../../constants';

const LIBRARY_IDS = new Set(AWS_FUNDING_PROGRAMS.map(p => p.id));

const fitColor = (s: number) =>
  s >= 80 ? 'bg-emerald-500' : s >= 60 ? 'bg-amber-500' : 'bg-slate-400';

const fitBadge = (s: number) =>
  s >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : s >= 60 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200';

interface Props {
  recommendations: AgentFundingRecommendation[];
  onNavigateToLibrary?: (programName: string) => void;
}

export const FundingPrograms: React.FC<Props> = ({ recommendations, onNavigateToLibrary }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const copy = (rec: AgentFundingRecommendation, i: number) => {
    navigator.clipboard.writeText(`Subject: ${rec.emailSubject}\n\n${rec.emailBody}`);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!recommendations.length) return (
    <section className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
      <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 font-semibold">No funding programs matched for this profile.</p>
    </section>
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 bg-emerald-50 rounded-lg"><Sparkles className="w-4 h-4 text-emerald-600" /></div>
        <h2 className="text-lg font-black text-slate-900">Funding Programs</h2>
        <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{recommendations.length} matched</span>
      </div>
      <div className="space-y-4">
        {recommendations.map((rec, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all group">
            <div className="flex">
              <div className={`w-1.5 flex-shrink-0 ${fitColor(rec.fitScore)}`} />
              <div className="flex-1 p-5">
                {/* Title row */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-base group-hover:text-emerald-700 transition-colors">{rec.programName}</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{rec.reason}</p>
                  </div>
                  <span className={`text-xs font-black px-3 py-1.5 rounded-full border flex items-center gap-1.5 flex-shrink-0 ${fitBadge(rec.fitScore)}`}>
                    <Sparkles className="w-3 h-3" />Recommended
                  </span>
                </div>

                {/* Benefits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">Customer Benefit</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{rec.customerValue}</p>
                  </div>
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-[11px] font-bold text-teal-700 uppercase tracking-widest">Partner Incentive</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{rec.partnerValue}</p>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {expanded === i ? 'Hide' : 'Show'} Draft Email
                    {expanded === i ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {onNavigateToLibrary && LIBRARY_IDS.has(rec.programId) && (
                    <button
                      onClick={() => onNavigateToLibrary(rec.programName)}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-teal-600 rounded-lg transition-all shadow-sm"
                    >
                      Full Program Details <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Draft email */}
                {expanded === i && (
                  <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-teal-500" />
                        <span className="text-xs font-bold text-slate-700">AI-Generated Outreach</span>
                      </div>
                      <button onClick={() => copy(rec, i)}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600">
                        {copied === i ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copied === i ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-slate-500 mb-2">
                        <span className="font-bold text-slate-700">Subject: </span>{rec.emailSubject}
                      </p>
                      <p className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">{rec.emailBody}</p>
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
