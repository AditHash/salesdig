
import React, { useState, useMemo, useEffect } from 'react';
import { AWS_FUNDING_PROGRAMS } from '../constants';
import { 
  Search, Rocket, Repeat, TrendingUp, Lightbulb, Building2, 
  Layers, RefreshCw, BookOpen, CheckCircle2, ChevronDown, 
  ChevronUp, Users, Briefcase, Zap, Info, Wallet, ArrowRight 
} from 'lucide-react';

interface LibraryViewProps {
  initialSearchTerm: string;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ initialSearchTerm }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(AWS_FUNDING_PROGRAMS.map(p => p.category)));
    return ['All', ...cats.sort()];
  }, []);

  const filteredPrograms = useMemo(() => {
    return AWS_FUNDING_PROGRAMS.filter(program => {
      const matchesSearch = program.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          program.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || program.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProgramId(expandedProgramId === id ? null : id);
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Startup': return <Rocket className="w-5 h-5 text-teal-500" />;
      case 'Migration': return <Repeat className="w-5 h-5 text-orange-500" />;
      case 'Optimization': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      case 'Innovation': return <Lightbulb className="w-5 h-5 text-amber-500" />;
      case 'Enterprise': return <Building2 className="w-5 h-5 text-slate-700" />;
      case 'Modernization': return <RefreshCw className="w-5 h-5 text-blue-500" />;
      default: return <Layers className="w-5 h-5 text-teal-400" />;
    }
  };

  return (
    <div className="pb-24">
      {/* Container for content with side padding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 md:p-12 shadow-2xl mb-10">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-teal-500 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
            
            <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
                   <BookOpen className="w-5 h-5 text-teal-300" />
                </div>
                <span className="text-sm font-bold tracking-wider text-teal-300 uppercase">Knowledge Hub</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                AWS Funding & <br/> Program Library
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
                Explore the comprehensive catalog of AWS credits, cash funding, and partner incentives designed to accelerate cloud adoption.
            </p>
            </div>
        </div>
      </div>

      {/* Sticky Navigation Bar */}
      <div className="sticky top-0 z-40 bg-[#f3f4f6]/95 backdrop-blur-xl border-y border-white/20 shadow-sm py-4 mb-10 transition-all">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Categories */}
            <div className="flex overflow-x-auto pb-1 gap-2 w-full md:w-auto scrollbar-hide no-scrollbar mask-fade-right">
                {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex-shrink-0 ${
                    selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-lg shadow-teal-500/20 scale-105'
                        : 'bg-white/50 text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
                    }`}
                >
                    {cat}
                </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-80 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                </div>
                <input
                type="text"
                className="block w-full pl-10 pr-4 py-2.5 border border-transparent rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-200 transition-all font-medium shadow-sm"
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
         </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {searchTerm && (
            <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
                <div className="h-px flex-1 bg-slate-200"></div>
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-widest">
                    {filteredPrograms.length} Result{filteredPrograms.length !== 1 && 's'} Found
                </h3>
                <div className="h-px flex-1 bg-slate-200"></div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPrograms.map((program) => (
                <div key={program.id} className="group relative flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-teal-200 transition-all duration-300 overflow-hidden animate-fade-in-up">
                    {/* Hover Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-50/0 via-transparent to-teal-50/0 group-hover:from-teal-50/30 group-hover:to-blue-50/30 transition-all duration-500 pointer-events-none"></div>

                    <div className="p-6 md:p-8 flex flex-col h-full relative z-10">
                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                                    {getCategoryIcon(program.category)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                                        {program.name}
                                    </h3>
                                    <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                                        {program.category} Program
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-slate-600 leading-relaxed font-medium mb-6">
                            {program.description}
                        </p>

                        {/* Eligibility & Example */}
                        <div className="space-y-4 mb-6 flex-grow">
                             {/* Eligibility Box */}
                             <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 border border-slate-100/50">
                                <div className="mt-0.5 p-1 bg-slate-100 rounded-lg">
                                    <Info className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">Eligibility</span>
                                    <p className="text-xs text-slate-700 font-medium leading-snug">{program.eligibility}</p>
                                </div>
                             </div>

                             {/* Example Box */}
                             <div className="flex items-start gap-3 p-3 rounded-xl bg-teal-50/30 border border-teal-100/50 group-hover:bg-teal-50/50 transition-colors">
                                <div className="mt-0.5 p-1 bg-teal-100 rounded-lg">
                                    <Zap className="w-3.5 h-3.5 text-teal-600" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wide block mb-0.5">Real World Use Case</span>
                                    <p className="text-xs text-slate-700 italic leading-snug">"{program.exampleScenario}"</p>
                                </div>
                             </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px w-full bg-slate-100 mb-4"></div>

                        {/* Footer / Expand Toggle */}
                        <div className="mt-auto">
                            <button 
                                onClick={(e) => toggleExpand(program.id, e)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                                    expandedProgramId === program.id
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-teal-600 border border-slate-200'
                                }`}
                            >
                                <span className="uppercase tracking-wider">
                                    {expandedProgramId === program.id ? 'Hide Specifics' : 'View Requirements & Benefits'}
                                </span>
                                {expandedProgramId === program.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {/* Expanded Content */}
                            {expandedProgramId === program.id && (
                                <div className="mt-4 pt-4 border-t border-slate-100 space-y-6 animate-fade-in-up">
                                    {/* Requirements */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> Requirements
                                        </h4>
                                        <ul className="space-y-2">
                                            {program.requirements?.map((req, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                                                    {req}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Customer Benefits */}
                                        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                            <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5" /> Customer Value
                                            </h4>
                                            <ul className="space-y-2">
                                                {program.customerBenefit.map((b, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                        {b}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        
                                        {/* Partner Benefits */}
                                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                            <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                                <Briefcase className="w-3.5 h-3.5" /> Partner Incentives
                                            </h4>
                                            <ul className="space-y-2">
                                                {program.partnerBenefit.map((b, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                                                        <Wallet className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                                                        {b}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {filteredPrograms.length === 0 && (
           <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                 <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No programs found</h3>
              <p className="text-slate-500">Try adjusting your search terms or category filter.</p>
           </div>
        )}
      </div>
    </div>
  );
};
