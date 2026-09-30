import React, { useState } from 'react';
import { ReportData } from '../../types';
import { EntityCheckBanner } from './EntityCheckBanner';
import { CompanyOverview } from './sections/CompanyOverview';
import { TechDNA } from './sections/TechDNA';
import { DecisionMakers } from './sections/DecisionMakers';
import { CompetitiveGaps } from './sections/CompetitiveGaps';
import { FundingPrograms } from './sections/FundingPrograms';
import { StrategicRoadmap } from './sections/StrategicRoadmap';
import { GenAiOpportunities } from './sections/GenAiOpportunities';
import { SalesPotential } from './sections/SalesPotential';
import { ZohoProducts } from './sections/ZohoProducts';
import { Building2, Cpu, Users, Swords, Sparkles, Map, Lightbulb, Target, Download, Loader2, ExternalLink, Boxes } from 'lucide-react';
import { downloadReportPdf } from '../../services/analysis.service';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'potential', label: 'Sales Potential', icon: Target },
  { id: 'tech', label: 'Tech DNA', icon: Cpu },
  { id: 'people', label: 'Decision Makers', icon: Users },
  { id: 'gaps', label: 'Competitive Gaps', icon: Swords },
  { id: 'funding', label: 'Funding', icon: Sparkles },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'genai', label: 'GenAI', icon: Lightbulb },
  { id: 'zoho', label: 'Partner Products', icon: Boxes },
] as const;

type TabId = typeof TABS[number]['id'];

interface Props {
  report: ReportData;
  showDownload?: boolean;
  onNavigateToLibrary?: (programName: string) => void;
}

export const AnalysisReport: React.FC<Props> = ({ report, showDownload = true, onNavigateToLibrary }) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [downloading, setDownloading] = useState(false);
  const visibleTabs = TABS.filter(tab =>
    (tab.id !== 'funding' || report.recommendations.length > 0) &&
    (tab.id !== 'zoho' || (report.partnerProductRecommendations ?? report.zohoRecommendations ?? []).length > 0)
  );

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await downloadReportPdf(report.reportId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.companyProfile.companyName}-Salesdig-Report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('PDF generation failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Collect all reference links
  const allRefs = Array.from(new Set([
    ...(report.companyProfile.sourceUrls ?? []),
    report.companyProfile.companyContactDetails?.officialContactPageUrl,
    ...(report.companyProfile.companyContactDetails?.addresses.map(a => a.sourceUrl) ?? []),
    ...(report.companyProfile.companyContactDetails?.phoneNumbers.map(p => p.sourceUrl) ?? []),
    ...(report.companyProfile.companyContactDetails?.emails.map(e => e.sourceUrl) ?? []),
    ...report.companyProfile.revenueData.flatMap(r => r.sourceUrls ?? []),
    ...report.directors.flatMap(d => d.sourceUrls ?? []),
  ])).filter((url): url is string => Boolean(url));

  return (
    <div className="space-y-5">
      {/* Entity check */}
      {report.entityCheck && <EntityCheckBanner check={report.entityCheck} />}

      {/* Tab bar + download */}
      <div className="flex items-center gap-2">
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-max min-w-full md:min-w-0">
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all
                  ${activeTab === id
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
        {showDownload && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-60 flex-shrink-0"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{downloading ? 'Generating...' : 'Download PDF'}</span>
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in-up">
        {activeTab === 'overview' && (
          <CompanyOverview
            profile={report.companyProfile}
            meta={report.meta}
          />
        )}
        {activeTab === 'potential' && (report.companyProfile.salesPotential || report.companyProfile.workmatesPotential) && (
          <SalesPotential potential={(report.companyProfile.salesPotential || report.companyProfile.workmatesPotential)!} />
        )}
        {activeTab === 'tech' && <TechDNA techStack={report.companyProfile.techStack} />}
        {activeTab === 'people' && <DecisionMakers directors={report.directors} companyProfile={report.companyProfile} />}
        {activeTab === 'gaps' && <CompetitiveGaps gaps={report.companyProfile.competitorAnalysis} />}
        {activeTab === 'funding' && <FundingPrograms recommendations={report.recommendations} onNavigateToLibrary={onNavigateToLibrary} />}
        {activeTab === 'roadmap' && <StrategicRoadmap strategy={report.strategy} />}
        {activeTab === 'genai' && <GenAiOpportunities opportunities={report.strategy.genAiOpportunities} />}
        {activeTab === 'zoho' && <ZohoProducts recommendations={report.partnerProductRecommendations ?? report.zohoRecommendations ?? []} />}
      </div>

      {/* References footer */}
      {allRefs.length > 0 && (
        <details className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
          <summary className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" /> References ({allRefs.length})
          </summary>
          <div className="px-5 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {allRefs.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-teal-600 hover:underline truncate flex items-center gap-1.5">
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                {url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}{url.length > 60 ? '…' : ''}
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
