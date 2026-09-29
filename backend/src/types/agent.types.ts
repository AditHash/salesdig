export type AgentName =
  | "orchestrator-agent"
  | "research-agent"
  | "strategy-agent";

export interface Evidence {
  url: string;
  title?: string;
  snippet?: string;
  sourceType?: "official" | "news" | "linkedin" | "other";
}

export interface DirectorRecord {
  name: string;
  title: string;
  email?: string;
  phoneNumber?: string;
  location?: string;
  background?: string;
  interestAreas?: string[];
  pitchStrategy?: string;
  sourceUrls: string[];
}

export interface CompetitorGap {
  competitorName: string;
  domainAdvantages?: { domain: string; advantage: string }[];
  competitorStrength?: string;
  customerGap: string;
  proposedInnovation: string;
  workmatesService: string;
  valueProposition: string;
}

export interface RevenuePoint {
  year: string;
  amount: string;
  cac?: string;
  trend?: "up" | "down" | "flat";
  sourceUrls?: string[];
}

export interface SalesPotential {
  cloudMigration: number;
  genAi: number;
  modernization: number;
  partnerProducts?: number;
  overall: number;
  summary: string;
}

export interface CompanyContactItem {
  label: string;
  value: string;
  sourceUrl?: string;
}

export interface CompanyContactAddress {
  label: string;
  value: string;
  sourceUrl?: string;
}

export interface CompanyContactDetails {
  officialContactPageUrl?: string;
  addresses: CompanyContactAddress[];
  phoneNumbers: CompanyContactItem[];
  emails: CompanyContactItem[];
}

export interface CompanyIntelData {
  companyName: string;
  websiteUrl?: string;
  companyDomain?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyContactDetails?: CompanyContactDetails;
  industry: string;
  segment: "Startup" | "SMB" | "Enterprise" | "Unknown";
  numberOfEmployees?: number | null;
  numberOfEmployeesSourceUrl?: string;
  currentCloud: string;
  cloudEvidence?: string;
  isAwsCustomer: boolean;
  description: string;
  techStack: Array<{ category: string; details: string }>;
  painPoints: string[];
  knownIssues: string[];
  competitorAnalysis: CompetitorGap[];
  revenueData: RevenuePoint[];
  salesPotential?: SalesPotential;
  sourceUrls: string[];
  decisionMakers: DirectorRecord[];
  domainIntel?: DomainIntel;
}

export interface DirectorsData {
  companyName: string;
  companyDomain?: string;
  directors: DirectorRecord[];
  sourceUrls: string[];
}

export interface FieldConfidence {
  field: string;
  score: number;
  reason: string;
}

export interface RejectedItem {
  field: string;
  value: string;
  reasons: string[];
}

export interface ValidationData {
  verifiedDirectors: DirectorRecord[];
  rejectedDirectors: Array<DirectorRecord & { reasons: string[] }>;
  verifiedCompany: CompanyIntelData;
  entityResolution: {
    requestedName: string;
    requestedDomain: string;
    resolvedName: string;
    resolvedDomain?: string;
    domainMatch: boolean;
    similarity: number;
    isMatch: boolean;
    reason: string;
  };
  rejectedFields: RejectedItem[];
  fieldConfidence: FieldConfidence[];
  overallConfidence: number;
  warnings: string[];
}

export interface FundingRecommendation {
  programId: string;
  programName: string;
  reason: string;
  fitScore: number;
  customerValue: string;
  partnerValue: string;
  emailSubject: string;
  emailBody: string;
}

export interface PartnerProductRecommendation {
  productName: string;
  category: string;
  reason: string;
  fitScore: number;
  useCase: string;
  mappedNeed?: string;
  customerValue: string;
}

export interface StrategyRoadmapPhase {
  phaseName: string;
  duration: string;
  focusArea: string;
  activities: string[];
  outcome: string;
}

export interface StrategyData {
  resolutions: Array<{
    painPoint: string;
    workmatesService: string;
    solutionStrategy: string;
    businessImpact: string;
  }>;
  roadmap: StrategyRoadmapPhase[];
  genAiOpportunities: Array<{
    category: string;
    title: string;
    description: string;
    example: string;
    businessValue: string;
  }>;
}

export interface StrategyFundingData {
  annualSpendUsed: number;
  annualSpendSource: "provided" | "estimated";
  recommendations: FundingRecommendation[];
  strategy: StrategyData;
}

export interface AgentExecutionResult<TData> {
  agent: AgentName;
  ok: boolean;
  data: TData;
  evidence: Evidence[];
  confidence: number;
  warnings: string[];
  startedAt: string;
  endedAt: string;
  durationMs: number;
}

export interface RunAnalysisInput {
  customerName: string;
  companyDomain: string;
}

export interface DomainIntel {
  emailDomain: string;
  hasMx: boolean;
  emailProvider: string;
  mxHosts: string[];
}
