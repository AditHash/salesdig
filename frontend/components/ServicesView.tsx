
import React, { useState } from 'react';
import { WORKMATES_SERVICE_CATALOG } from '../constants';
import { Briefcase, Cloud, ShieldCheck, Database, Headphones, Search, ArrowRight, Zap, Target, Terminal, Lock, Server, BarChart3, Repeat } from 'lucide-react';

export const ServicesView: React.FC<{ companyName?: string; services?: string[] }> = ({ companyName = 'Workmates', services = [] }) => {
  const [activeCategory, setActiveCategory] = useState<string>(WORKMATES_SERVICE_CATALOG[0].id);
  const [searchTerm, setSearchTerm] = useState('');

  const getIconForService = (name: string) => {
    if (name.includes('Security') || name.includes('Audit')) return <ShieldCheck className="w-6 h-6 text-rose-500" />;
    if (name.includes('Database')) return <Database className="w-6 h-6 text-blue-500" />;
    if (name.includes('Support') || name.includes('Managed')) return <Headphones className="w-6 h-6 text-emerald-500" />;
    if (name.includes('Migration')) return <Repeat className="w-6 h-6 text-orange-500" />;
    if (name.includes('DevOps') || name.includes('Application')) return <Terminal className="w-6 h-6 text-purple-500" />;
    if (name.includes('Cost') || name.includes('Billing')) return <BarChart3 className="w-6 h-6 text-green-600" />;
    if (name.includes('Infra') || name.includes('DR')) return <Server className="w-6 h-6 text-cyan-500" />;
    return <Cloud className="w-6 h-6 text-indigo-500" />;
  };

  const filteredCategories = WORKMATES_SERVICE_CATALOG.map(cat => ({
    ...cat,
    services: cat.services.filter(svc => 
      svc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      svc.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.services.length > 0);

  if (companyName !== 'Workmates') {
    const configuredServices = services.filter(service => service.toLowerCase().includes(searchTerm.toLowerCase()));
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6 pb-20 md:p-8">
        <header className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-300">{companyName} service catalog</p>
          <h1 className="mt-3 text-3xl font-extrabold">Configured sales offerings</h1>
          <p className="mt-2 max-w-2xl text-slate-300">Offerings your team configured for company research and sales recommendations.</p>
        </header>
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search your services..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
        {configuredServices.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {configuredServices.map(service => (
              <article key={service} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">{getIconForService(service)}</div>
                <h2 className="font-bold text-slate-900">{service}</h2>
                <p className="mt-2 text-sm text-slate-500">A configured offering for your sales team to consider when researching customer needs.</p>
              </article>
            ))}
          </div>
        ) : <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No services match your search. Workspace admins can update this list in Company Settings.</p>}
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Container for content with side padding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 md:p-12 shadow-2xl mb-10">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-emerald-500 rounded-full blur-3xl opacity-20"></div>
            
            <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
                <Briefcase className="w-5 h-5 text-indigo-300" />
                </div>
                <span className="text-sm font-bold tracking-wider text-indigo-300 uppercase">Service Catalog</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                Enterprise-Grade <br/> Cloud Capabilities
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
                From migration to managed services, our expert teams act as an extension of your IT department, ensuring security, scalability, and cost-efficiency.
            </p>
            </div>
        </div>
      </div>

      {/* Sticky Navigation Bar - Full Width with Negative Margins/Padding trick */}
      <div className="sticky top-0 z-40 bg-[#f3f4f6]/95 backdrop-blur-xl border-y border-white/20 shadow-sm py-4 mb-10 transition-all">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Categories */}
            <div className="flex overflow-x-auto pb-1 gap-2 w-full md:w-auto scrollbar-hide no-scrollbar mask-fade-right">
                {WORKMATES_SERVICE_CATALOG.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex-shrink-0 ${
                    activeCategory === cat.id 
                        ? 'bg-slate-900 text-white shadow-lg shadow-indigo-500/20 scale-105' 
                        : 'bg-white/50 text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
                    }`}
                >
                    {cat.title}
                </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-80 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                type="text"
                className="block w-full pl-10 pr-4 py-2.5 border border-transparent rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-200 transition-all font-medium shadow-sm"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
         </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {filteredCategories
          .filter(cat => searchTerm ? true : cat.id === activeCategory)
          .map((category) => (
          <div key={category.id} className="animate-fade-in-up">
            {searchTerm && (
               <div className="flex items-center gap-3 mb-6">
                 <div className="h-px flex-1 bg-slate-200"></div>
                 <h3 className="text-xl font-bold text-slate-900 uppercase tracking-widest">{category.title}</h3>
                 <div className="h-px flex-1 bg-slate-200"></div>
               </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.services.map((service, idx) => (
                <div key={idx} className="group relative flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 overflow-hidden">
                  {/* Hover Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 via-transparent to-indigo-50/0 group-hover:from-indigo-50/30 group-hover:to-purple-50/30 transition-all duration-500 pointer-events-none"></div>
                  
                  <div className="p-6 flex flex-col h-full relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                       <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                          {getIconForService(service.name)}
                       </div>
                    </div>

                    <h4 className="text-lg font-bold text-slate-900 mb-2 leading-tight group-hover:text-indigo-700 transition-colors">
                      {service.name}
                    </h4>
                    
                    <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-grow font-medium">
                      {service.description}
                    </p>

                    <div className="space-y-4">
                       {/* Fit For Badge */}
                       <div className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <div className="text-xs">
                             <span className="font-bold text-slate-900 uppercase tracking-wide">Best For:</span>
                             <p className="text-slate-600 mt-0.5">{service.fitFor}</p>
                          </div>
                       </div>

                       {/* Example Box */}
                       <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 group-hover:bg-white group-hover:border-indigo-100 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                             <Zap className="w-3.5 h-3.5 text-indigo-500" />
                             <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Real Scenario</span>
                          </div>
                          <p className="text-xs text-slate-600 italic leading-relaxed">
                            "{service.example}"
                          </p>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {filteredCategories.length === 0 && (
           <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                 <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No services found</h3>
              <p className="text-slate-500">Try adjusting your search terms to find what you're looking for.</p>
           </div>
        )}
      </div>

    </div>
  );
};
