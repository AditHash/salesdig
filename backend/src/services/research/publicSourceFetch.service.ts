import crypto from "node:crypto";
import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";

export class SourceFetchError extends Error {}

export interface FetchedSource {
  url: string;
  title: string;
  content: string;
  contentHash: string;
  retrievedAt: Date;
  publishedAt: Date | null;
  sourceType: "company" | "news" | "jobs" | "other";
}

const blockedV4 = (address: string): boolean => {
  const [a, b, c] = address.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 0 && c === 2))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113);
};

export const isPublicAddress = (value: string): boolean => {
  const address = value.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(address) === 4) return !blockedV4(address);
  if (isIP(address) !== 6) return false;
  if (address.startsWith("::ffff:")) {
    const mapped = address.slice(7);
    return isIP(mapped) === 4 && !blockedV4(mapped);
  }
  return !(address === "::" || address === "::1" || /^f[cd]/.test(address) ||
    /^fe[89ab]/.test(address) || address.startsWith("ff") ||
    address.startsWith("2001:db8:") || address.startsWith("2001:0:"));
};

export const parsePublicUrl = (raw: string): URL => {
  let url: URL;
  try { url = new URL(raw); }
  catch { throw new SourceFetchError("Source URL is invalid"); }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port ||
      !hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || hostname.endsWith(".internal") ||
      (isIP(hostname) && !isPublicAddress(hostname)) || raw.length > 2000) {
    throw new SourceFetchError("Source URL is not a permitted public HTTP address");
  }
  url.hash = "";
  return url;
};

export const resolvePublicHost = async (hostname: string, resolver = dns.lookup): Promise<{ address: string; family: number }> => {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new SourceFetchError("Source resolves to a private address");
    return { address: host, family: isIP(host) };
  }
  const records = await resolver(host, { all: true, verbatim: true }) as Array<{ address: string; family: number }>;
  if (!records.length || records.some(record => !isPublicAddress(record.address))) {
    throw new SourceFetchError("Source resolves to a private or unavailable address");
  }
  return records[0];
};

const decodeEntities = (text: string): string => text.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) => {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  if (entity.startsWith("#")) {
    const codepoint = Number.parseInt(entity.slice(entity.startsWith("#x") ? 2 : 1), entity.startsWith("#x") ? 16 : 10);
    return codepoint > 0 && codepoint <= 0x10ffff && !(codepoint >= 0xd800 && codepoint <= 0xdfff)
      ? String.fromCodePoint(codepoint) : match;
  }
  return named[entity.toLowerCase()] ?? match;
});

export const extractPageText = (body: string): { title: string; content: string; publishedAt: Date | null } => {
  const title = decodeEntities((body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim()).slice(0, 300);
  const published = body.match(/<meta[^>]+(?:property|name)=["'](?:article:published_time|datePublished)["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const parsed = published ? new Date(published) : null;
  const publishedAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  const content = decodeEntities(body.replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ").trim().slice(0, 8000);
  return { title, content, publishedAt };
};

const requestText = async (url: URL): Promise<{ status: number; location?: string; body: string; type: string }> => {
  const pinned = await resolvePublicHost(url.hostname);
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.request(url, {
      method: "GET", timeout: 8000,
      headers: { "User-Agent": "SalesdigResearch/2.0", Accept: "text/html,text/plain", "Accept-Encoding": "identity" },
      lookup: (_host, _options, callback) => callback(null, pinned.address, pinned.family)
    }, response => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      const type = String(response.headers["content-type"] ?? "");
      if (status >= 300 && status < 400) {
        response.resume();
        resolve({ status, location, body: "", type });
        return;
      }
      if (status !== 200 || !/^(text\/html|text\/plain)(?:;|$)/i.test(type) ||
          (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity")) {
        response.resume(); reject(new SourceFetchError("Source did not return readable public text")); return;
      }
      const parts: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 200_000) { request.destroy(new SourceFetchError("Source exceeds 200 KB limit")); return; }
        parts.push(chunk);
      });
      response.on("end", () => resolve({ status, body: Buffer.concat(parts).toString("utf8"), type }));
      response.on("error", reject);
    });
    request.on("timeout", () => request.destroy(new SourceFetchError("Source timed out")));
    request.on("error", reject);
    request.end();
  });
};

export const fetchPublicSource = async (raw: string, companyDomain: string): Promise<FetchedSource> => {
  let url = parsePublicUrl(raw);
  for (let redirect = 0; redirect <= 2; redirect++) {
    const response = await requestText(url);
    if (response.status >= 300 && response.status < 400) {
      if (!response.location || redirect === 2) throw new SourceFetchError("Source redirected too many times");
      url = parsePublicUrl(new URL(response.location, url).toString());
      continue;
    }
    const page = extractPageText(response.body);
    if (page.content.length < 50) throw new SourceFetchError("Source contains too little readable text");
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const sourceType = host === companyDomain || host.endsWith(`.${companyDomain}`) ? "company" :
      /\b(job|career|hiring)\b/i.test(url.pathname) ? "jobs" :
        /\b(news|press|release)\b/i.test(url.pathname) ? "news" : "other";
    return { url: url.toString(), title: page.title || host, content: page.content,
      contentHash: crypto.createHash("sha256").update(page.content).digest("hex"),
      retrievedAt: new Date(), publishedAt: page.publishedAt, sourceType };
  }
  throw new SourceFetchError("Source redirected too many times");
};
