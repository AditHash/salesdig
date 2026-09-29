export enum AppTab {
  ANALYSIS = 'ANALYSIS',
  LIBRARY = 'LIBRARY',
  SERVICES = 'SERVICES',
  ACTIVITY = 'ACTIVITY',
  HISTORY = 'HISTORY',
  ADMIN = 'ADMIN',
  ADMIN_ANALYSES = 'ADMIN_ANALYSES',
  WORKSPACE = 'WORKSPACE',
  PROFILE = 'PROFILE',
}

export interface AgentRevenuePoint {
  year: string;
  amount: string;
  cac?: string;
  trend?: 'up' | 'down' | 'flat';
  sourceUrls?: string[];
}

export interface AgentCompetitorGap {
  competitorName: string;
  domainAdvantages: { domain: string; advantage: string }[];
  customerGap: string;
  proposedInnovation: string;
  workmatesService: string;
  valueProposition: string;
}

export interface AgentTechStack {
  category: string;
  details: string;
}

export interface DomainIntel {
  emailDomain: string;
  hasMx: boolean;
  emailProvider: string;
  mxHosts: string[];
}

export interface AgentSalesPotential {
  cloudMigration: number;
  genAi: number;
  modernization: number;
  partnerProducts?: number;
  /** Legacy field retained for reports created before workspaces. */
  zoho?: number;
  overall: number;
  summary: string;
}

export interface AgentCompanyContactItem {
  label: string;
  value: string;
  sourceUrl?: string;
}

export interface AgentCompanyContactAddress {
  label: string;
  value: string;
  sourceUrl?: string;
}

export interface AgentCompanyContactDetails {
  officialContactPageUrl?: string;
  addresses: AgentCompanyContactAddress[];
  phoneNumbers: AgentCompanyContactItem[];
  emails: AgentCompanyContactItem[];
}

export interface AgentCompanyProfile {
  companyName: string;
  websiteUrl?: string;
  companyDomain?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyContactDetails?: AgentCompanyContactDetails;
  industry: string;
  segment: 'Startup' | 'SMB' | 'Enterprise' | 'Unknown';
  numberOfEmployees?: number | null;
  numberOfEmployeesSourceUrl?: string;
  currentCloud: string;
  cloudEvidence?: string;
  isAwsCustomer: boolean;
  description: string;
  techStack: AgentTechStack[];
  painPoints: string[];
  knownIssues: string[];
  competitorAnalysis: AgentCompetitorGap[];
  revenueData: AgentRevenuePoint[];
  salesPotential?: AgentSalesPotential;
  workmatesPotential?: AgentSalesPotential;
  sourceUrls: string[];
  domainIntel?: DomainIntel;
}

export interface AgentDirector {
  name: string;
  title: string;
  location?: string;
  background?: string;
  interestAreas?: string[];
  pitchStrategy?: string;
  linkedInSearchUrl?: string;
  sourceUrls: string[];
}

export interface AgentFundingRecommendation {
  programId: string;
  programName: string;
  reason: string;
  fitScore: number;
  customerValue: string;
  partnerValue: string;
  emailSubject: string;
  emailBody: string;
}

export interface AgentPartnerProductRecommendation {
  productName: string;
  category: string;
  reason: string;
  fitScore: number;
  useCase: string;
  mappedNeed?: string;
  customerValue: string;
}

export interface AgentResolution {
  painPoint: string;
  workmatesService: string;
  solutionStrategy: string;
  businessImpact: string;
}

export interface AgentRoadmapPhase {
  phaseName: string;
  duration: string;
  focusArea: string;
  activities: string[];
  outcome: string;
}

export interface AgentGenAiOpportunity {
  category: string;
  title: string;
  description: string;
  example: string;
  businessValue: string;
}

export interface AgentStrategy {
  resolutions: AgentResolution[];
  roadmap: AgentRoadmapPhase[];
  genAiOpportunities: AgentGenAiOpportunity[];
}

export interface EntityCheck {
  requestedName: string;
  requestedDomain: string;
  resolvedName: string;
  resolvedDomain?: string;
  nameSimilarity: number;
  domainMatch: boolean;
  isMatch: boolean;
  status: 'confirmed' | 'possible_mismatch' | 'mismatch_blocked';
  message: string;
}

export interface AnalysisMeta {
  annualSpendUsed: number;
  annualSpendSource: 'provided' | 'estimated';
  warnings: string[];
  durationMs: number;
}

export interface RunAnalysisResponse {
  runId: string;
  reportId: string;
  status: 'completed';
  overallConfidence: number;
  entityCheck: EntityCheck;
  meta: AnalysisMeta;
  data: {
    companyProfile: AgentCompanyProfile;
    directors: {
      verified: AgentDirector[];
      rejected: Array<AgentDirector & { reasons: string[] }>;
    };
    recommendations: AgentFundingRecommendation[];
    strategy: AgentStrategy;
    partnerProductRecommendations?: AgentPartnerProductRecommendation[];
    zohoRecommendations?: AgentPartnerProductRecommendation[];
  };
}

// Normalised shape used by all UI components
export interface ReportData {
  reportId: string;
  runId?: string;
  overallConfidence: number;
  entityCheck?: EntityCheck;
  meta?: AnalysisMeta;
  companyProfile: AgentCompanyProfile;
  directors: AgentDirector[];
  recommendations: AgentFundingRecommendation[];
  strategy: AgentStrategy;
  partnerProductRecommendations?: AgentPartnerProductRecommendation[];
  zohoRecommendations?: AgentPartnerProductRecommendation[];
  createdAt?: string;
}

// Shape from GET /api/analysis/v2/reports and /report/:id
export interface SavedReport {
  _id: string;
  userId: string;
  runId: string;
  customerName: string;
  companyDomain: string;
  annualSpend: number;
  validatedProfile: any;
  recommendations: AgentFundingRecommendation[];
  strategy: AgentStrategy;
  partnerProductRecommendations?: AgentPartnerProductRecommendation[];
  zohoRecommendations?: AgentPartnerProductRecommendation[];
  overallConfidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchState {
  isSearching: boolean;
  error?: string;
}

export interface FundingProgram {
  id: string;
  name: string;
  description: string;
  eligibility: string;
  requirements?: string[];
  partnerBenefit: string[];
  customerBenefit: string[];
  exampleScenario: string;
  category: 'Startup' | 'Migration' | 'Optimization' | 'Innovation' | 'Enterprise' | 'General' | 'Partner' | 'Modernization';
}

export interface ServiceItem {
  name: string;
  description: string;
  example: string;
  fitFor: string;
}

export interface ServiceCategory {
  id: string;
  title: string;
  description: string;
  services: ServiceItem[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  usedReportIds?: string[];
}

export interface ChatUsedReport {
  id: string;
  customerName: string;
  companyDomain: string;
}

export interface ChatResponse {
  reply: string;
  usedReports: ChatUsedReport[];
}
