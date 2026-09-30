import { Response } from "express";
import puppeteer from "puppeteer";
import { AuthRequest } from "../middlewares/isAuth.js";
import { postgres } from "../config/postgres.js";
import { IAnalysisReport } from "../models/analysisReport.model.js";
import { mapDbRow } from "../utils/dbRows.js";
import { logActivity } from "../utils/logActivity.js";
import { getWorkspaceSettings } from "../config/postgres.js";
import { DEFAULT_WORKSPACE_SETTINGS } from "../config/workspaceDefaults.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.resolve(__dirname, "../../../frontend/public/salesdig-mark.svg");
const logoBase64 = fs.existsSync(logoPath)
  ? `data:image/svg+xml;base64,${fs.readFileSync(logoPath).toString("base64")}`
  : "";

const pct   = (n: number) => `${Math.round(n * 100)}%`;
const money = (n: number) => `$${Number(n).toLocaleString()}`;
const esc   = (s: any)    => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function buildHtml(report: any, profile: any, directors: any[], logo: string, workspace = DEFAULT_WORKSPACE_SETTINGS): string {
  const recs: any[]  = report.recommendations ?? [];
  const strat: any   = report.strategy ?? {};
  const resolutions: any[] = strat.resolutions ?? [];
  const roadmap: any[]     = strat.roadmap ?? [];
  const genAi: any[]       = strat.genAiOpportunities ?? [];
  const partnerProductRecs: any[] = report.partnerProductRecommendations ?? report.zohoRecommendations ?? [];

  /* ── helpers ── */
  const brandColor = workspace.primaryColor === "#4f52d3" ? "#0f766e" : workspace.primaryColor;
  const reportWorkspaceName = workspace.companyName === "Workmates" ? "Salesdig" : workspace.companyName;
  const badge = (t: string, bg = brandColor) =>
    `<span style="background:${bg};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;margin-right:4px">${esc(t)}</span>`;

  const section = (num: string, title: string, body: string, color = brandColor) =>
    `<div class="section">
      <div style="height:18px"></div>
      <div class="section-banner" style="background:${color}">${num} · ${esc(title).toUpperCase()}</div>
      ${body}
    </div>`;

  const label = (t: string) =>
    `<div style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:.6px;text-transform:uppercase;margin:8px 0 2px">${esc(t)}</div>`;

  const divider = () => `<hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0">`;

  /* ── cover ── */
  const potential = profile.salesPotential ?? profile.workmatesPotential;
  const cover = `
    <div class="cover">
      <!-- left dark panel -->
      <div style="position:absolute;top:0;left:0;width:52%;height:100%;background:#0f172a;z-index:0"></div>
      <!-- right light panel -->
      <div style="position:absolute;top:0;right:0;width:48%;height:100%;background:#f8fafc;z-index:0"></div>

      <!-- content -->
      <div style="position:relative;z-index:1;display:flex;height:100%;min-height:100vh">
        <!-- left -->
        <div style="width:52%;padding:56px 40px;display:flex;flex-direction:column;justify-content:space-between">
          <div>
            ${logo ? `<img src="${logo}" style="height:36px;margin-bottom:40px;object-fit:contain" />` : `<div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.5);letter-spacing:2px;margin-bottom:40px">${esc(workspace.companyName).toUpperCase()}</div>`}
            <div style="width:40px;height:3px;background:#14b8a6;margin-bottom:20px"></div>
            <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:2px;margin-bottom:12px">SALESDIG · INTELLIGENCE BRIEF</div>
            <h1 style="font-size:32px;color:#fff;font-weight:800;line-height:1.2;margin:0 0 8px">${esc(report.customerName)}</h1>
            <div style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:24px">${esc(report.companyDomain)}</div>
            <div style="margin-bottom:28px">
              ${profile.segment    ? badge(profile.segment) : ""}
              ${profile.industry   ? badge(profile.industry,   "#115e59") : ""}
              ${potential ? badge(
                  potential.overall >= 70 ? "⚡ High Potential" :
                  potential.overall >= 40 ? "⚡ Medium Potential" : "⚡ Low Potential",
                  potential.overall >= 70 ? "#059669" : potential.overall >= 40 ? "#d97706" : "#e11d48"
                ) : ""}
              ${profile.isAwsCustomer ? badge("AWS ✓","#065f46") : ""}
            </div>
            <p style="font-size:12px;color:rgba(255,255,255,.6);line-height:1.7;max-width:280px">${esc((profile.description??"").slice(0,220))}${(profile.description??"").length>220?"…":""}</p>
            ${(() => {
              const cd = profile.companyContactDetails;
              const emails = cd?.emails?.length ? cd.emails : (profile.companyEmail ? [{label:"Email",value:profile.companyEmail}] : []);
              const phones = cd?.phoneNumbers?.length ? cd.phoneNumbers : (profile.companyPhone ? [{label:"Phone",value:profile.companyPhone}] : []);
              const addrs  = cd?.addresses ?? [];
              if (!emails.length && !phones.length && !addrs.length) return "";
              return `<div style="margin-top:20px;display:flex;flex-direction:column;gap:5px">
                ${emails.slice(0,2).map((e:any)=>`<div style="font-size:11px;color:rgba(255,255,255,.5)">✉ ${esc(e.value)}</div>`).join("")}
                ${phones.slice(0,2).map((p:any)=>`<div style="font-size:11px;color:rgba(255,255,255,.5)">📞 ${esc(p.value)}</div>`).join("")}
                ${addrs.slice(0,1).map((a:any)=>`<div style="font-size:11px;color:rgba(255,255,255,.5)">📍 ${esc(a.value)}</div>`).join("")}
              </div>`;
            })()}
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,.25)">Prepared by ${esc(reportWorkspaceName)} · Confidential · ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
        </div>

        <!-- right -->
        <div style="width:48%;padding:56px 36px;display:flex;flex-direction:column;gap:20px">
          <!-- employees + segment -->
          <div style="display:flex;gap:12px">
            <div style="flex:1;background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
              <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:.8px;text-transform:uppercase;margin-bottom:4px">Employees</div>
              <div style="font-size:22px;font-weight:800;color:#0284c7">${profile.numberOfEmployees != null ? Number(profile.numberOfEmployees).toLocaleString() : "—"}</div>
            </div>
            <div style="flex:1;background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
              <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:.8px;text-transform:uppercase;margin-bottom:4px">Segment</div>
              <div style="font-size:22px;font-weight:800;color:#0f766e">${esc(profile.segment??"—")}</div>
            </div>
          </div>
          ${potential ? `
          <!-- sales potential -->
          <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
            <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:.8px;text-transform:uppercase;margin-bottom:10px">Sales Potential</div>
            ${[
              {l:"Cloud Migration", v:potential.cloudMigration, c:"#2563eb"},
              {l:"GenAI Adoption",  v:potential.genAi,          c:"#0891b2"},
              {l:"Modernization",   v:potential.modernization,  c:"#d97706"},
              ...(typeof potential.zoho === "number" ? [{l:"Business App Adoption", v:potential.zoho, c:"#c8102e"}] : []),
            ].map(b=>`
              <div style="margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;color:#334155;margin-bottom:3px">
                  <span>${b.l}</span><span style="color:${b.c}">${b.v}</span>
                </div>
                <div style="background:#e2e8f0;border-radius:4px;height:5px">
                  <div style="background:${b.c};width:${b.v}%;height:5px;border-radius:4px"></div>
                </div>
              </div>`).join("")}
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;align-items:center;gap:10px">
              <div style="font-size:28px;font-weight:800;color:#059669">${potential.overall}</div>
              <div style="font-size:10px;color:#64748b;line-height:1.5">${esc(potential.summary)}</div>
            </div>
          </div>` : ""}
          <!-- latest revenue -->
          ${(profile.revenueData??[]).length ? `
          <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
            <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:.8px;text-transform:uppercase;margin-bottom:8px">Latest Revenue</div>
            ${(profile.revenueData as any[]).slice(0,2).map((r:any)=>`
              <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid #f1f5f9">
                <span style="color:#64748b">${esc(r.year)}</span>
                <span style="font-weight:700;color:#1e1b4b">${esc(r.amount)}</span>
              </div>`).join("")}
          </div>` : ""}
          <!-- domain intelligence -->
          ${(profile as any).domainIntel ? (() => { const di = (profile as any).domainIntel; return `
          <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
            <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:.8px;text-transform:uppercase;margin-bottom:10px">Mail Provider (detected from MX records)</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <div style="font-size:11px;font-weight:600;color:${di.hasMx ? "#059669" : "#e11d48"}">${di.hasMx ? "✓ Active mail domain" : "✗ No MX records"}</div>
              ${di.emailProvider && di.emailProvider !== "Unknown" ? `<div style="font-size:11px;font-weight:600;color:#6d28d9;background:#f5f3ff;border:1px solid #ddd6fe;padding:2px 8px;border-radius:10px">${esc(di.emailProvider)}</div>` : ""}
            </div>
          </div>`; })() : ""}
        </div>
      </div>
    </div>`;

  /* ── 01 company overview ── */
  const revenueRows = (profile.revenueData ?? []).map((r: any) => `
    <tr>
      <td>${esc(r.year)}</td>
      <td style="font-weight:700;color:#1e1b4b">${esc(r.amount)}</td>
      <td>${esc(r.cac ?? "—")}</td>
      <td style="color:${r.trend==="up"?"#059669":r.trend==="down"?"#e11d48":"#64748b"};font-weight:700">
        ${r.trend==="up"?"↑ Up":r.trend==="down"?"↓ Down":"→ Flat"}
      </td>
    </tr>`).join("");

  const overview = section("01","Company Overview",`
    <h2 style="color:#1e1b4b;margin:0 0 4px">${esc(profile.companyName ?? report.customerName)}</h2>
    <p style="color:#334155;font-size:12px;line-height:1.6">${esc(profile.description ?? "")}</p>
    ${profile.cloudEvidence ? `${label("Cloud Evidence")}<p style="color:#334155;font-style:italic;font-size:12px">${esc(profile.cloudEvidence)}</p>` : ""}
    ${divider()}
    <div style="display:flex;gap:0;margin-bottom:12px">
      ${[
        {l:"Segment",      v:profile.segment??    "—", c:"#0f766e"},
        {l:"Potential",    v:potential ? (potential.overall >= 70 ? "High" : potential.overall >= 40 ? "Medium" : "Low") : "—", c: potential ? (potential.overall >= 70 ? "#059669" : potential.overall >= 40 ? "#d97706" : "#e11d48") : "#64748b"},
        {l:"AWS Customer", v:profile.isAwsCustomer?"Yes ✓":"No", c:profile.isAwsCustomer?"#059669":"#64748b"},
        {l:"Employees",    v:profile.numberOfEmployees != null ? Number(profile.numberOfEmployees).toLocaleString() : "—", c:"#0284c7"},
      ].map(col=>`
        <div style="flex:1;padding:10px 12px;background:#f8fafc;border-right:1px solid #e2e8f0">
          <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:.6px;text-transform:uppercase">${col.l}</div>
          <div style="font-size:18px;font-weight:700;color:${col.c}">${esc(col.v)}</div>
        </div>`).join("")}
    </div>
    ${revenueRows ? `
      ${divider()}
      ${label("Financial Health")}
      <table class="data-table">
        <thead><tr><th>Year</th><th>Revenue</th><th>CAC</th><th>Trend</th></tr></thead>
        <tbody>${revenueRows}</tbody>
      </table>` : ""}
    ${(profile as any).domainIntel ? (() => {
      const di = (profile as any).domainIntel;
      return `${divider()}
        ${label("Mail Provider (detected from MX records)")}
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:4px">
          <div>
            <div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">MX STATUS</div>
            <div style="font-size:12px;font-weight:600;color:${di.hasMx ? "#059669" : "#e11d48"}">${di.hasMx ? "✓ Active mail domain" : "✗ No MX records found"}</div>
          </div>
          ${di.emailProvider && di.emailProvider !== "Unknown" ? `<div>
            <div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">PROVIDER</div>
            <div style="font-size:12px;font-weight:600;color:#6d28d9;background:#f5f3ff;border:1px solid #ddd6fe;padding:3px 10px;border-radius:12px;display:inline-block">${esc(di.emailProvider)}</div>
          </div>` : ""}
        </div>`;
    })() : ""}
    ${(profile.painPoints??[]).length ? `
      ${divider()}
      ${label("Pain Points")}
      ${(profile.painPoints as string[]).map(p=>`<div style="color:#e11d48;font-size:12px;margin:2px 0">• ${esc(p)}</div>`).join("")}` : ""}
    ${(profile.knownIssues??[]).length ? `
      ${divider()}
      ${label("Known Issues")}
      ${(profile.knownIssues as string[]).map(p=>`<div style="color:#d97706;font-size:12px;margin:2px 0">• ${esc(p)}</div>`).join("")}` : ""}
    ${(() => {
      const cd = profile.companyContactDetails;
      const emails = cd?.emails?.length ? cd.emails : (profile.companyEmail ? [{label:"Email",value:profile.companyEmail}] : []);
      const phones = cd?.phoneNumbers?.length ? cd.phoneNumbers : (profile.companyPhone ? [{label:"Phone",value:profile.companyPhone}] : []);
      const addrs  = cd?.addresses ?? [];
      const pageUrl = cd?.officialContactPageUrl;
      if (!emails.length && !phones.length && !addrs.length) return "";
      return `${divider()}
        ${label("Company Contact Details")}
        <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:4px">
          ${emails.length ? `<div style="min-width:200px">
            <div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px">EMAIL</div>
            ${emails.map((e:any)=>`<div style="font-size:12px;color:#334155;margin:2px 0">${e.label ? `<span style="color:#94a3b8;font-size:10px">${esc(e.label)}: </span>` : ""}${esc(e.value)}</div>`).join("")}
          </div>` : ""}
          ${phones.length ? `<div style="min-width:160px">
            <div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px">PHONE</div>
            ${phones.map((p:any)=>`<div style="font-size:12px;color:#334155;margin:2px 0">${p.label ? `<span style="color:#94a3b8;font-size:10px">${esc(p.label)}: </span>` : ""}${esc(p.value)}</div>`).join("")}
          </div>` : ""}
          ${addrs.length ? `<div style="min-width:220px">
            <div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px">ADDRESS</div>
            ${addrs.map((a:any)=>`<div style="font-size:12px;color:#334155;margin:2px 0">${a.label ? `<span style="color:#94a3b8;font-size:10px">${esc(a.label)}: </span>` : ""}${esc(a.value)}</div>`).join("")}
          </div>` : ""}
        </div>
        ${pageUrl ? `<div style="margin-top:6px;font-size:11px;color:#0f766e">🔗 ${esc(pageUrl)}</div>` : ""}`;
    })()}
  `);

  /* ── 02 tech dna ── */
  const techDna = (profile.techStack??[]).length ? section("02","Technology DNA",
    (profile.techStack as any[]).map(s=>`
      ${label(s.category)}
      <p style="color:#334155;font-size:12px;line-height:1.6">${esc(s.details)}</p>
    `).join("")
  ) : "";

  /* ── 03 decision makers ── */
  const dm = directors.length ? section("03","Decision Makers",
    directors.map(d=>`
      <div style="margin-bottom:12px">
        <div style="font-size:14px;font-weight:700;color:#1e1b4b">${esc(d.name)}</div>
        <div style="font-size:12px;font-weight:700;color:#0f766e">${esc(d.title)}</div>
        ${d.location ? `<div style="font-size:11px;color:#64748b">📍 ${esc(d.location)}</div>` : ""}
        ${d.background ? `<p style="font-size:12px;color:#334155;line-height:1.6">${esc(d.background)}</p>` : ""}
        ${(d.interestAreas??[]).length ? `${label("Key Interests")}<div style="font-size:12px;font-weight:700;color:#d97706">${(d.interestAreas as string[]).join(" · ")}</div>` : ""}
        ${d.pitchStrategy ? `${label("Engagement Strategy")}<div style="font-size:12px;color:#059669;font-style:italic">"${esc(d.pitchStrategy)}"</div>` : ""}
        ${divider()}
      </div>
    `).join("")
  ) : "";

  /* ── 04 competitive gaps ── */
  const gaps = (profile.competitorAnalysis??[]).length ? section("04","Competitive Gaps",
    (profile.competitorAnalysis as any[]).map(g=>`
      <div style="margin-bottom:16px">
        <div style="font-size:14px;font-weight:700;color:#1e1b4b">vs ${esc(g.competitorName)}</div>
        ${(g.domainAdvantages??[]).length ? `
          <div style="margin:8px 0 4px">
            ${(g.domainAdvantages as any[]).map((d:any)=>`
              <div style="display:flex;gap:8px;margin-bottom:5px;font-size:12px">
                <span style="font-weight:700;color:#0f766e;min-width:130px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;padding-top:1px">${esc(d.domain)}</span>
                <span style="color:#334155;line-height:1.5">${esc(d.advantage)}</span>
              </div>`).join("")}
          </div>` : ""}
        ${label("Pain Point")}<div style="font-size:12px;color:#e11d48">${esc(g.customerGap)}</div>
        ${label("Innovation Fix")}<div style="font-size:12px;font-weight:700;color:#0f172a">${esc(g.proposedInnovation)}</div>
        <div style="font-size:11px;font-weight:700;color:#0f766e">Deploy: ${esc(g.workmatesService)}</div>
        ${label("Business Value")}<div style="font-size:12px;font-weight:700;color:#059669">${esc(g.valueProposition)}</div>
        ${divider()}
      </div>
    `).join("")
  ) : "";

  /* ── 05 funding ── */
  const funding = recs.length ? section("05","Funding Programs",
    recs.map(r=>`
      <div style="margin-bottom:14px">
        <div style="font-size:14px;font-weight:700;color:#1e1b4b">${esc(r.programName)}</div>
        <p style="font-size:12px;color:#334155;line-height:1.6">${esc(r.reason)}</p>
        ${r.customerValue?.trim() ? `${label("Customer Benefit")}<div style="font-size:12px;font-weight:700;color:#0f172a">${esc(r.customerValue)}</div>` : ""}
        ${r.partnerValue?.trim() ? `${label("Partner Incentive")}<div style="font-size:12px;font-weight:700;color:#0f172a">${esc(r.partnerValue)}</div>` : ""}
        ${(r.emailSubject?.trim() || r.emailBody?.trim()) ? `
        ${label("Draft Email")}
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;font-size:11px;color:#334155;line-height:1.6">
          ${r.emailSubject?.trim() ? `<strong>Subject:</strong> ${esc(r.emailSubject)}<br><br>` : ""}${esc(r.emailBody)}
        </div>` : ""}
        ${divider()}
      </div>
    `).join("")
  ) : "";

  /* ── 06 resolutions ── */
  const resolutionsHtml = resolutions.length ? section("05","Strategic Resolutions",
    resolutions.map(r=>`
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:#0f766e">${esc(r.workmatesService)}</div>
        <div style="font-size:13px;font-weight:700;color:#1e1b4b">${esc(r.painPoint)}</div>
        <p style="font-size:12px;color:#334155;line-height:1.6">${esc(r.solutionStrategy)}</p>
        <div style="font-size:12px;font-weight:700;color:#059669">↑ ${esc(r.businessImpact)}</div>
        ${divider()}
      </div>
    `).join("")
  ) : "";

  /* ── 07 roadmap ── */
  const roadmapHtml = roadmap.length ? section("06","Cloud Adoption Timeline",
    roadmap.map((phase: any, i: number)=>`
      <div style="margin-bottom:14px">
        <div style="font-size:10px;font-weight:700;color:#0f766e;letter-spacing:.6px">
          PHASE ${String(i+1).padStart(2,"0")} · ${esc(phase.duration)} · ${esc(phase.focusArea)}
        </div>
        <div style="font-size:14px;font-weight:700;color:#1e1b4b">${esc(phase.phaseName)}</div>
        ${(phase.activities??[]).map((a:string)=>`<div style="font-size:12px;color:#334155;margin:2px 0">• ${esc(a)}</div>`).join("")}
        <div style="font-size:12px;font-weight:700;color:#059669;margin-top:4px">✓ ${esc(phase.outcome)}</div>
        ${divider()}
      </div>
    `).join("")
  ) : "";

  /* ── 08 genai ── */
  const genAiHtml = genAi.length ? section("07","GenAI Opportunities",
    genAi.map(op=>`
      <div style="margin-bottom:12px">
        <div style="font-size:14px;font-weight:700;color:#1e1b4b">${esc(op.title)}</div>
        <div style="font-size:11px;font-weight:700;color:#d97706">${esc(op.category)}</div>
        <p style="font-size:12px;color:#334155;line-height:1.6">${esc(op.description)}</p>
        ${label("Example")}<div style="font-size:11px;color:#334155;font-style:italic">${esc(op.example)}</div>
        <div style="font-size:12px;font-weight:700;color:#059669">Value: ${esc(op.businessValue)}</div>
        ${divider()}
      </div>
    `).join("")
  ) : "";

  /* ── 09 sales potential ── */
  const potentialHtml = potential ? section("08","Sales Potential", `
    <div style="display:flex;align-items:center;gap:24px;margin-bottom:14px">
      <div style="text-align:center">
        <div style="font-size:36px;font-weight:700;color:#059669">${potential.overall}</div>
        <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:.6px;text-transform:uppercase">Overall Score</div>
      </div>
      <div style="width:1px;height:48px;background:#e2e8f0"></div>
      <p style="font-size:12px;color:#334155;line-height:1.6;flex:1">${esc(potential.summary)}</p>
    </div>
    ${[
      {l:"Cloud Migration", v:potential.cloudMigration, c:"#2563eb"},
      {l:"GenAI Adoption",  v:potential.genAi,          c:"#0891b2"},
      {l:"Modernization",   v:potential.modernization,  c:"#d97706"},
      ...(typeof potential.zoho === "number" ? [{l:"Business App Adoption", v:potential.zoho, c:"#c8102e"}] : []),
    ].map(b=>`
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:#334155;margin-bottom:3px">
          <span>${b.l}</span><span style="color:${b.c}">${b.v}</span>
        </div>
        <div style="background:#e2e8f0;border-radius:4px;height:6px">
          <div style="background:${b.c};width:${b.v}%;height:6px;border-radius:4px"></div>
        </div>
      </div>`).join("")}
  `, "#059669") : "";

  /* ── 09 zoho products ── */
  const zohoHtml = partnerProductRecs.length ? section("09","Recommended Partner Products",
    partnerProductRecs.map(z=>`
      <div style="margin-bottom:14px">
        <div style="display:flex;align-items:baseline;gap:8px">
          <div style="font-size:14px;font-weight:700;color:#1e1b4b">${esc(z.productName)}</div>
          ${z.category ? `<span style="font-size:10px;font-weight:700;color:#c8102e;background:#fdeaec;border:1px solid #f6c9cf;padding:1px 8px;border-radius:10px">${esc(z.category)}</span>` : ""}
          ${typeof z.fitScore === "number" ? `<span style="margin-left:auto;font-size:11px;font-weight:700;color:${z.fitScore>=80?"#059669":z.fitScore>=60?"#d97706":"#64748b"}">Fit ${esc(z.fitScore)}/100</span>` : ""}
        </div>
        ${z.reason ? `<p style="font-size:12px;color:#334155;line-height:1.6">${esc(z.reason)}</p>` : ""}
        ${z.mappedNeed ? `${label("Addresses")}<div style="font-size:12px;color:#e11d48">${esc(z.mappedNeed)}</div>` : ""}
        ${z.useCase ? `${label("Use Case")}<div style="font-size:12px;color:#334155">${esc(z.useCase)}</div>` : ""}
        ${z.customerValue ? `${label("Customer Value")}<div style="font-size:12px;font-weight:700;color:#059669">${esc(z.customerValue)}</div>` : ""}
        ${divider()}
      </div>
    `).join("")
  , "#c8102e") : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #334155; font-size: 13px; line-height: 1.7; }
    .cover { min-height: 100vh; position: relative; page-break-after: always; overflow: hidden; }
    /* hide puppeteer header on cover page by overlapping it */
    .cover::before { content:''; position:absolute; top:-60px; left:0; right:0; height:60px; background:#1e1b4b; z-index:10; }
    .section { padding: 28px 48px; margin-bottom: 4px; }
    .section-banner {
      color: #fff; font-size: 18px; font-weight: 800; letter-spacing: 1px;
      padding: 14px 48px; margin: 0 -48px 20px; page-break-after: avoid;
      text-align: center;
    }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    .data-table th { background: #f1f5f9; color: #64748b; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .5px; padding: 8px 10px; text-align: left; }
    .data-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
    h2 { font-size: 20px; margin-bottom: 6px; }
    p  { line-height: 1.7; margin: 5px 0; }
    @media print {
      .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section-banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .data-table th  { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
  </head><body>
    ${cover}
    ${overview}
    ${techDna}
    ${dm}
    ${gaps}
    ${resolutionsHtml}
    ${roadmapHtml}
    ${genAiHtml}
    ${potentialHtml}
    ${zohoHtml}
  </body></html>`;
}

export const generateReportPdf = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const reportResult = await postgres.query(
      "SELECT * FROM analysis_reports WHERE id = $1 AND workspace_id = $2",
      [req.params.reportId, req.workspaceId]
    );
    const report = mapDbRow<IAnalysisReport>(reportResult.rows[0]) as any;
    if (!report) return res.status(404).json({ message: "Report not found" });
    if (req.userRole !== "admin" && report.userId !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const profile   = report.validatedProfile?.verifiedCompany ?? report.validatedProfile ?? {};
    const directors: any[] = report.validatedProfile?.verifiedDirectors ?? [];

    const workspace = await getWorkspaceSettings(req.workspaceId!) || DEFAULT_WORKSPACE_SETTINGS;
    const workspaceLabel = workspace.companyName === "Workmates" ? "Salesdig" : workspace.companyName;
    const workspaceLogo = logoBase64;
    const html = buildHtml(report, profile, directors, workspaceLogo, workspace);

    const browser = await puppeteer.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu"
  ]
});
    const page    = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 1200000 });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "24px", bottom: "52px", left: "0", right: "0" },
      displayHeaderFooter: true,
      headerTemplate: `<span></span>`,
      footerTemplate: `
        <div style="width:100%;padding:0 40px 8px;display:flex;justify-content:space-between;align-items:center;font-family:Helvetica,Arial,sans-serif">
          <span style="font-size:9px;color:#94a3b8">${esc(workspaceLabel)} · Confidential</span>
          ${workspaceLogo ? `<img src="${workspaceLogo}" style="height:18px;object-fit:contain;position:absolute;left:50%;transform:translateX(-50%)" />` : ""}
          <span style="font-size:9px;color:#94a3b8"><span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    const filename = `${String(report.customerName).replace(/[^a-z0-9_-]+/gi, "-")}-Salesdig-Report.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    logActivity(req.userId!, "DOWNLOAD_REPORT", `/history/${req.params.reportId}`, `${report.customerName} | ${report.companyDomain}`);
    res.send(pdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message: "PDF generation failed", error: message });
  }
};
