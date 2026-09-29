import React from 'react';
import { AgentDirector, AgentCompanyProfile } from '../../../types';
import { Mail, Phone, Linkedin, Globe, MapPin, Target, Building2, ExternalLink } from 'lucide-react';

const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
const isReal = (v?: string) => v && !['not publicly available', 'n/a', 'na', 'none', 'unknown'].includes(v.toLowerCase().trim());
const telHref = (value: string) => `tel:${value.replace(/[^+\d]/g, '')}`;

export const DecisionMakers: React.FC<{ directors: AgentDirector[], companyProfile: AgentCompanyProfile }> = ({ directors, companyProfile }) => (
  <section className="space-y-4">
    <div className="flex items-center gap-2 mb-1">
      <div className="p-2 bg-violet-50 rounded-lg">
        <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </div>
      <h2 className="text-lg font-black text-slate-900">Decision Makers</h2>
      <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">{directors.length} verified</span>
    </div>

    {(() => {
      const contactDetails = companyProfile.companyContactDetails;
      const hasStructuredContacts = !!contactDetails && (
        !!contactDetails.officialContactPageUrl ||
        contactDetails.addresses.length > 0 ||
        contactDetails.phoneNumbers.length > 0 ||
        contactDetails.emails.length > 0
      );

      if (!hasStructuredContacts && !isReal(companyProfile.companyEmail) && !isReal(companyProfile.companyPhone)) {
        return null;
      }

      return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 sm:p-5 mb-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-blue-900">
              <Building2 className="w-5 h-5" />
              <span className="text-sm font-bold">Company Contact Details</span>
            </div>
            {contactDetails?.officialContactPageUrl && (
              <a
                href={contactDetails.officialContactPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Official contact page
              </a>
            )}
          </div>

          {contactDetails?.addresses.length ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Addresses</p>
              {contactDetails.addresses.map((address, index) => (
                <div key={`${address.label}-${index}`} className="bg-white border border-blue-100 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        {address.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{address.value}</p>
                    </div>
                    {address.sourceUrl && (
                      <a href={address.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        Source
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {contactDetails?.phoneNumbers.length ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Phone Numbers</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contactDetails.phoneNumbers.map((phone, index) => (
                  <div key={`${phone.label}-${index}`} className="bg-white border border-blue-100 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{phone.label}</p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <a href={telHref(phone.value)} className="text-sm font-mono text-blue-700 hover:text-blue-900 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {phone.value}
                      </a>
                      {phone.sourceUrl && (
                        <a href={phone.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5" />
                          Source
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {contactDetails?.emails.length ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Email Contacts</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contactDetails.emails.map((email, index) => (
                  <div key={`${email.label}-${index}`} className="bg-white border border-blue-100 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{email.label}</p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <a href={`mailto:${email.value}`} className="text-sm font-mono text-blue-700 hover:text-blue-900 flex items-center gap-1.5 break-all">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        {email.value}
                      </a>
                      {email.sourceUrl && (
                        <a href={email.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5" />
                          Source
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!hasStructuredContacts && (
            <div className="flex flex-wrap gap-3">
              {isReal(companyProfile.companyEmail) && (
                <a href={`mailto:${companyProfile.companyEmail}`} className="flex items-center gap-1.5 text-xs bg-white px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors font-mono">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />{companyProfile.companyEmail}
                </a>
              )}
              {isReal(companyProfile.companyPhone) && (
                <a href={telHref(companyProfile.companyPhone!)} className="flex items-center gap-1.5 text-xs bg-white px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 font-mono">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />{companyProfile.companyPhone}
                </a>
              )}
            </div>
          )}
        </div>
      );
    })()}

    {directors.length === 0
      ? <p className="text-sm text-slate-400 italic">No decision makers could be verified</p>
      : <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {directors.map((dm, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-violet-300 hover:shadow-lg transition-all group">
            {/* Header */}
            <div className="p-5 pb-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center font-black text-base flex-shrink-0 shadow-md">
                    {initials(dm.name)}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 leading-tight">{dm.name}</p>
                    <p className="text-xs font-bold text-violet-600 mt-0.5">{dm.title}</p>
                    {dm.location && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{dm.location}
                      </p>
                    )}
                  </div>
                </div>
                {/* Action links */}
                <div className="flex gap-1.5 flex-shrink-0">
                  {dm.linkedInSearchUrl && (
                    <a href={dm.linkedInSearchUrl} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:bg-[#0077b5] hover:text-white hover:border-[#0077b5] transition-all" title="LinkedIn">
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {dm.sourceUrls?.[0] && (
                    <a href={dm.sourceUrls[0]} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all" title="Source">
                      <Globe className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Background */}
              {dm.background && (
                <p className="text-sm text-slate-600 leading-relaxed">{dm.background}</p>
              )}

              {/* Interest areas */}
              {dm.interestAreas && dm.interestAreas.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Key Interests</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dm.interestAreas.map((tag, j) => (
                      <span key={j} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pitch strategy */}
              {dm.pitchStrategy && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">Engagement Strategy</p>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed italic">"{dm.pitchStrategy}"</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>}
  </section>
);
