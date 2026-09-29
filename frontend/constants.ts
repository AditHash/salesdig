
import { FundingProgram, ServiceCategory } from './types';

export const WORKMATES_SERVICES = [
  "Cloud Migration",
  "Infra/Application Modernization",
  "Database Migration / Modernization",
  "DR & Backup Implementation",
  "Security Assessment / Audit / ISV Setup",
  "Cloud Cost Optimization (One-time)",
  "DevOps/DevSecOps/GitOps/FinOps Implementation",
  "Application Development",
  "Zoho Migration (Mail / Apps/CRM)",
  "AWS Infra Managed Services",
  "Security Managed Services",
  "DevOps Managed Services",
  "Database Managed Services",
  "DA/GenAI Managed Services",
  "Zoho Managed Services",
  "Application Managed Services",
  "AWS Billing Transfer",
  "ISV Reselling (Commvault, Veeam, Zoho, etc.)",
  "Resource Transfer"
];

export const WORKMATES_SERVICE_CATALOG: ServiceCategory[] = [
  {
    id: 'otc',
    title: 'OTC (One-Time Cost)',
    description: 'Project-based professional services designed to build, migrate, or transform technology environments.',
    services: [
      {
        name: "Cloud Migration",
        description: "Moving servers, applications, and data from on-premise data centers or other clouds to AWS.",
        example: "Migrating a legacy SAP environment from a physical data center to AWS EC2 for scalability.",
        fitFor: "Companies closing data centers or moving away from expensive colocation contracts."
      },
      {
        name: "Infra/Application Modernization",
        description: "Refactoring legacy monolithic applications into modern, scalable microservices or serverless architectures.",
        example: "Converting a .NET monolith application into AWS Lambda functions and Docker containers.",
        fitFor: "Businesses dealing with slow application performance or inability to scale features quickly."
      },
      {
        name: "Database Migration / Modernization",
        description: "Moving databases to the cloud or converting proprietary engines (Oracle/SQL Server) to open-source (PostgreSQL/MySQL).",
        example: "Migrating an expensive Oracle database to Amazon Aurora PostgreSQL to save 90% on licensing fees.",
        fitFor: "Organizations paying high licensing fees for Oracle or Microsoft SQL Server."
      },
      {
        name: "DR & Backup Implementation",
        description: "Setting up Disaster Recovery sites and automated backup strategies to ensure business continuity.",
        example: "Setting up a 'Pilot Light' DR strategy on AWS that can spin up in minutes if the main site fails.",
        fitFor: "Regulated industries (Finance, Healthcare) requiring business continuity compliance."
      },
      {
        name: "Security Assessment / Audit / ISV Setup",
        description: "Vulnerability assessments (VAPT), compliance auditing (ISO, PCI-DSS), and deploying security tools.",
        example: "Deploying Fortinet Firewalls and running a VAPT assessment to clear a fintech for PCI-DSS compliance.",
        fitFor: "Companies preparing for compliance audits or enhancing security posture."
      },
      {
        name: "Cloud Cost Optimization (One-time)",
        description: "A deep-dive audit into cloud billing to identify waste and implement immediate savings.",
        example: "Identifying unattached storage volumes and over-provisioned instances to save $5,000/month instantly.",
        fitFor: "Startups or Enterprises whose cloud bills have grown uncontrollably."
      },
      {
        name: "DevOps/DevSecOps/GitOps/FinOps",
        description: "Setting up automated CI/CD pipelines, infrastructure-as-code, and automated security scanning.",
        example: "Building a Jenkins/GitLab pipeline that automatically tests and deploys code to production in 10 minutes.",
        fitFor: "Development teams facing slow release cycles or manual deployment errors."
      },
      {
        name: "Application Development",
        description: "Custom software development for web, mobile, or backend systems.",
        example: "Building a custom React Native mobile app for a logistics company to track drivers in real-time.",
        fitFor: "Businesses needing bespoke software solutions not available off-the-shelf."
      },
      {
        name: "Zoho Migration",
        description: "Migrating email, CRM, and business apps from GSuite/Office365 or legacy systems to Zoho.",
        example: "Moving 500 users from Google Workspace to Zoho Mail to reduce operating costs.",
        fitFor: "SMBs looking for cost-effective alternatives to Google/Microsoft suites."
      }
    ]
  },
  {
    id: 'managed',
    title: 'Managed Services',
    description: 'Recurring monthly support services where Workmates takes responsibility for uptime, security, and operations.',
    services: [
      {
        name: "AWS Infra Managed Services",
        description: "24/7 monitoring, patching, and incident response for AWS infrastructure.",
        example: "Monitoring CPU usage and server health 24/7, rebooting services automatically if they crash at 3 AM.",
        fitFor: "Companies without a dedicated 24/7 IT operations team."
      },
      {
        name: "Security Managed Services",
        description: "Continuous threat detection, SOC monitoring, and security policy management.",
        example: "A dedicated security team analyzing AWS GuardDuty logs to block malicious IPs attacking the network.",
        fitFor: "Fintechs and Healthcare companies handling sensitive user data."
      },
      {
        name: "DevOps Managed Services",
        description: "Ongoing maintenance of CI/CD pipelines, Kubernetes clusters, and release management.",
        example: "Managing EKS upgrades and fixing broken deployment pipelines so developers focus only on coding.",
        fitFor: "Agile teams who want developers coding, not managing servers."
      },
      {
        name: "Database Managed Services",
        description: "DBA-as-a-Service covering performance tuning, backups, and query optimization.",
        example: "Regularly optimizing slow SQL queries and ensuring read-replicas are synchronized.",
        fitFor: "High-traffic applications where database performance is the bottleneck."
      },
      {
        name: "DA/GenAI Managed Services",
        description: "Maintenance of Data pipelines (ETL) and Generative AI models (LLMOps).",
        example: "Ensuring the daily sales data pipeline runs successfully and retraining the AI chatbot model monthly.",
        fitFor: "Enterprises relying on real-time analytics and AI features."
      },
      {
        name: "Zoho Managed Services",
        description: "Admin support for Zoho One suite (CRM, Mail, Books, etc.).",
        example: "Creating new user workflows in Zoho CRM and troubleshooting email deliverability issues.",
        fitFor: "Companies deeply integrated into the Zoho ecosystem."
      },
      {
        name: "Application Managed Services",
        description: "L2/L3 support for custom applications, ensuring code-level uptime and bug fixing.",
        example: "Troubleshooting specific application errors and deploying hotfixes to production.",
        fitFor: "Product companies ensuring SLA guarantees to their customers."
      }
    ]
  },
  {
    id: 'reselling',
    title: 'Reselling',
    description: 'Procurement services providing consolidated billing, discounts, and license management.',
    services: [
      {
        name: "AWS Billing Transfer",
        description: "Consolidating AWS billing under Workmates to unlock volume discounts and free Enterprise Support.",
        example: "Moving a direct AWS payer account to Workmates to get a flat 3% discount and free CloudCheckr access.",
        fitFor: "Any AWS customer paying list price directly to AWS via credit card."
      },
      {
        name: "ISV Reselling",
        description: "Procurement of third-party software licenses (Commvault, Veeam, Zoho, etc.) at partner rates.",
        example: "Buying 100 Veeam Backup licenses through Workmates at a lower cost than buying direct.",
        fitFor: "IT Procurement teams looking to consolidate vendor spend."
      }
    ]
  },
  {
    id: 'resource',
    title: 'Resource',
    description: 'Staff augmentation and resource placement services.',
    services: [
      {
        name: "Resource Transfer",
        description: "Providing skilled engineers on a contract or contract-to-hire basis (Staff Augmentation).",
        example: "Providing 3 Senior DevOps Engineers to work directly under the client's CTO for a 6-month project.",
        fitFor: "Companies needing temporary specialized skills without long-term hiring commitments."
      }
    ]
  }
];

export const GENAI_USE_CASES_LIBRARY = [
  // 1. Enhance Customer Experience
  { category: "Customer Experience", name: "Conversational AI", description: "Autonomous AI agents resolve complex customer queries end-to-end.", example: "AI troubleshoots Wi-Fi issues based on router model." },
  { category: "Customer Experience", name: "Real-Time Agent Assistance", description: "AI provides live suggestions, policies, and summaries during calls.", example: "Refund policy auto-displayed during support call." },
  { category: "Customer Experience", name: "Hyper-Personalization", description: "Personalized marketing and outreach using customer behavior.", example: "Eco-friendly messaging shown to sustainability-focused users." },
  { category: "Customer Experience", name: "Virtual Try-Ons", description: "AI-generated product simulations for immersive interaction.", example: "Sofa rendered inside customer’s living room photo." },
  { category: "Customer Experience", name: "Sentiment Analysis", description: "AI analyzes reviews and social data to detect emerging issues.", example: "AI flags repeated delivery delay complaints." },
  { category: "Customer Experience", name: "Global Voice AI", description: "Real-time multilingual translation and voice synthesis.", example: "Support manuals translated into regional dialects instantly." },
  { category: "Customer Experience", name: "Churn Prediction", description: "AI predicts churn and triggers retention actions.", example: "Loyalty offer sent before customer cancellation." },

  // 2. Improve Productivity
  { category: "Productivity", name: "Creative Asset Generation", description: "Rapid creation of marketing visuals and copy.", example: "50 ad variations generated in one hour." },
  { category: "Productivity", name: "Information Synthesis", description: "Extracts insights from large unstructured datasets (contracts, docs).", example: "Legal risk extracted from 500 contracts." },
  { category: "Productivity", name: "Automated Reporting", description: "AI generates executive summaries explaining trends.", example: "Quarterly finance summary auto-written." },
  { category: "Productivity", name: "Code Modernization", description: "AI refactors legacy code and generates documentation.", example: "COBOL converted to Python with comments." },
  { category: "Productivity", name: "Personalized Training", description: "Custom training modules and role-play simulations.", example: "AI simulates difficult client conversations for sales rep." },
  { category: "Productivity", name: "Transaction Anomaly Detection", description: "Detects fraud and errors in financial data.", example: "Suspicious payment patterns flagged instantly." },
  { category: "Productivity", name: "Vendor Negotiation AI", description: "Compares vendor proposals and flags risks.", example: "Unfavorable contract clauses highlighted." },

  // 3. Cutting Edge / Advanced
  { category: "Cutting Edge", name: "Predictive AIOps", description: "Predicts system failures and auto-generates repair scripts.", example: "Minimizes downtime by predicting disk failure." },
  { category: "Cutting Edge", name: "Dynamic FinOps", description: "Continuous cloud cost analysis and resource right-sizing.", example: "15 underutilized servers identified and stopped." },
  { category: "Cutting Edge", name: "Self-Healing Infrastructure", description: "Predicts failures and auto-remediates across clouds.", example: "Auto-scaling triggered before outage." },
  { category: "Cutting Edge", name: "Autonomous Threat Hunting", description: "Proactively detects zero-day and advanced security threats.", example: "Lateral movement attack identified early." },
  { category: "Cutting Edge", name: "Digital Twins", description: "Real-time simulation of systems or infrastructure.", example: "Outage impact predicted before rollout." },
  { category: "Cutting Edge", name: "Generative Design", description: "AI generates and evaluates thousands of design variations.", example: "Optimized lightweight car component design." }
];

export const AWS_FUNDING_PROGRAMS: FundingProgram[] = [
  {
    id: 'activate',
    name: 'AWS Activate',
    category: 'Startup',
    description: 'The go-to program for startups. It provides free credits and technical support to help new companies launch and survive their early stages without worrying about server bills.',
    eligibility: 'For startups only. You must be associated with an Activate Partner (like a VC or Accelerator) for the high tier, or just have a LinkedIn profile for the Founders tier.',
    requirements: [
      "Must be a new Startup (Series A or below)",
      "Associated with an Activate Partner (Portfolio Tier) OR active LinkedIn (Founders Tier)",
      "No previous Activate credits redeemed > $100k",
      "Company website must be live"
    ],
    partnerBenefit: [
        "Increases portfolio startup runway by lowering cloud costs.",
        "Zero-cost value-add for VCs, Accelerators, and Incubators.",
        "Reduces technical friction for early-stage companies."
    ],
    customerBenefit: [
        "Up to $100,000 USD in AWS promotional credits.",
        "Free access to AWS Business Support for technical help.",
        "Access to pre-built architecture templates and labs."
    ],
    exampleScenario: 'A new app startup funded by Y-Combinator applies and gets $100k in credits, making their AWS bill $0 for the first year.'
  },
  {
    id: 'lift',
    name: 'AWS Lift',
    category: 'Startup',
    description: 'A starter pack for small businesses (SMBs). If you commit to spending money on AWS, AWS will match your payment with credits, dollar-for-dollar.',
    eligibility: 'For customers spending less than $750/month today. You must start billing at least $1 on AWS to trigger the rewards.',
    requirements: [
      "Existing AWS spend must be < $750/month",
      "Must bill through an AWS Partner or Direct",
      "Must bill at least $1 in the first 90 days to trigger credits",
      "Not eligible if previously received Lift credits"
    ],
    partnerBenefit: [
        "Accelerates sales cycles with 'Buy One Get One' incentive.",
        "Ideal conversation starter for cost-conscious SMBs.",
        "Requires minimal technical validation to activate."
    ],
    customerBenefit: [
        "1:1 Dollar matching: Spend $1, Get $1 in credits.",
        "Receive up to $83,500 in total credits over 12 months.",
        "No equity required, unlike startup programs."
    ],
    exampleScenario: 'A local retail chain moves their inventory system to AWS. They spend $2,000 in Month 1, and AWS gives them a $2,000 credit for Month 2.'
  },
  {
    id: 'map',
    name: 'Migration Acceleration Program (MAP)',
    category: 'Migration',
    description: 'The big funding bucket for large-scale moves to the cloud. Designed for enterprises moving hundreds of servers or expensive databases.',
    eligibility: 'For projects with at least $500,000 projected annual spend. Requires a 3-stage process: Assess, Mobilize, and Migrate.',
    requirements: [
      "Projected annual recurring revenue (ARR) > $500,000",
      "Workload must be net-new to AWS (Migration)",
      "Must follow the 3-stage process: Assess, Mobilize, Migrate",
      "Requires tagging of migrated resources for credit tracking"
    ],
    partnerBenefit: [
        "Earn 15-25% of customer annual spend in cash fees.",
        "Unlocks additional 'Mobilize' funding for assessment phases.",
        "Positions partner as a strategic long-term advisor."
    ],
    customerBenefit: [
        "Significant credits (25%+) to offset 'Double Bubble' migration costs.",
        "Subsidized partner engineering hours for the migration.",
        "Access to specialized AWS Solution Architects."
    ],
    exampleScenario: 'A bank closes a physical data center and moves to AWS. The project will cost $1M/year. AWS gives them $250k in credits to help pay for the move.'
  },
  {
    id: 'iwp_migrate',
    name: 'Integrated Workload Partner (IWP) - Migrate',
    category: 'Migration',
    description: 'Like MAP, but for mid-sized projects. Perfect for when a customer is moving a specific application rather than an entire data center.',
    eligibility: 'For opportunities worth between $24,000 and $500,000 per year.',
    requirements: [
      "Projected annual spend between $24,000 and $500,000",
      "Must be a specific application/workload migration",
      "Requires Partner-led engagement",
      "Opportunity must be registered in AWS Partner Central"
    ],
    partnerBenefit: [
        "Cash fees for mid-sized migration projects (approx 20%).",
        "Simplified approval process compared to full MAP.",
        "Builds pipeline for managed services."
    ],
    customerBenefit: [
        "Credits to lower the TCO of specific workload moves.",
        "Professional support for critical app migrations.",
        "Faster time-to-cloud for isolated applications."
    ],
    exampleScenario: 'A healthcare software company moves their main patient portal app to AWS. Expected spend is $100k/year. AWS provides ~$25k in funding.'
  },
  {
    id: 'iwp_assess',
    name: 'Integrated Workload Partner (IWP) - Assess',
    category: 'Optimization',
    description: 'Funding to pay for a "Discovery" study. It answers the questions: "Can we move to cloud?" and "How much will it cost?".',
    eligibility: 'Available once per year per customer. Used when a customer is interested but stuck on the financials.',
    requirements: [
      "Customer must be interested in cloud migration/modernization",
      "Available once per calendar year per customer",
      "Deliverable must be a TCO Report or Business Case",
      "Partner must be validated for the specific competency"
    ],
    partnerBenefit: [
        "Get paid (~$5k-$15k) to deliver TCO/Business Case reports.",
        "Low-risk entry engagement to prove value to client.",
        "High conversion rate from Assessment to Migration."
    ],
    customerBenefit: [
        "Receive a professional Cloud Readiness Assessment for free.",
        "Detailed TCO report comparing On-Prem vs AWS costs.",
        "Risk-free evaluation before committing to migration."
    ],
    exampleScenario: 'A manufacturing firm is scared of cloud costs. A partner uses this fund to do a free analysis showing them exactly how much they would save.'
  },
  {
    id: 'ola',
    name: 'Optimization and Licensing Assessment (OLA)',
    category: 'Optimization',
    description: 'A tool to save money on software licenses (Windows, SQL Server). It analyzes what you use vs. what you pay for.',
    eligibility: 'For customers with heavy usage of Microsoft Windows, SQL Server, or VMware on-premise.',
    requirements: [
      "Significant on-premise footprint (Windows, SQL, VMware)",
      "Customer must agree to install the OLA Collector tool",
      "Goal must be licensing optimization or migration planning",
      "Minimum scope: usually 50+ instances/VMs"
    ],
    partnerBenefit: [
        "Cash funding ($2.5k-$10k) for running licensing assessments.",
        "Data-driven way to prove ROI to CFOs.",
        "Identifies immediate consolidation opportunities."
    ],
    customerBenefit: [
        "Reduce Windows/SQL licensing costs by 30-50%.",
        "Right-size infrastructure based on actual usage data.",
        "Build a factual business case for modernization."
    ],
    exampleScenario: 'A company is paying for 100 SQL Server licenses. OLA proves they only need 60 on AWS, saving them $200k/year in licensing fees.'
  },
  {
    id: 'mva',
    name: 'Microsoft Modernization (MVA)',
    category: 'Modernization',
    description: 'Funding to help rewrite old Windows apps into modern, cheaper formats (like Linux or Containers).',
    eligibility: 'For projects that convert Windows/SQL Server to Linux/Aurora Open Source.',
    requirements: [
      "Project must refactor Windows to Linux or SQL Server to Open Source DB",
      "Workload must be moving to AWS or already on AWS",
      "Partner must have Microsoft Competency",
      "Must demonstrate removal of licensing costs"
    ],
    partnerBenefit: [
        "Significant cash funding (up to $50k) to cover engineering.",
        "Differentiation through modernization (not just lift-and-shift).",
        "Deepens stickiness by moving client to cloud-native DBs."
    ],
    customerBenefit: [
        "Eliminate expensive OS/DB licensing fees permanently.",
        "Move to open-source engines (Linux, Postgres) with AWS funding.",
        "Modernize legacy .NET apps to containers/serverless."
    ],
    exampleScenario: 'A logistics company rewrites their .NET application to run on Linux containers, removing the need to pay Windows Server fees.'
  },
  {
    id: 'iwp_build',
    name: 'Integrated Workload Partner (IWP) - Build',
    category: 'Innovation',
    description: 'Funding for building something brand new (Greenfield). Encourages using modern tools like AI, Serverless, or Analytics.',
    eligibility: 'For new projects (not migrations) that will spend at least $24k/year.',
    requirements: [
      "New 'Greenfield' project (not a lift-and-shift migration)",
      "Projected annual spend > $24,000",
      "Should utilize modern services (Lambda, DynamoDB, AI/ML)",
      "Opportunity registered in APN Portal"
    ],
    partnerBenefit: [
        "Fund prototype and MVP development phases.",
        "Incentivize use of advanced services (AI, Serverless).",
        "Accelerate innovation project timelines."
    ],
    customerBenefit: [
        "Subsidized engineering costs for new product development.",
        "Faster time-to-market for greenfield applications.",
        "Risk mitigation for trying new technologies."
    ],
    exampleScenario: 'A media company hires a partner to build a new AI Video Recommendation engine from scratch.'
  },
  {
    id: 'rapid_genai',
    name: 'Rapid GenAI Workload Funding',
    category: 'Innovation',
    description: 'Special funding to push Generative AI projects from "cool idea" to "real production app".',
    eligibility: 'Must be a Generative AI project (using Bedrock/SageMaker) going into production.',
    requirements: [
      "Use case must involve Generative AI (Bedrock, SageMaker, Q)",
      "Must have a clear path to production (not just research)",
      "Requires validated GenAI Partner",
      "High technical complexity justification"
    ],
    partnerBenefit: [
        "Premium cash incentives for specialized GenAI work.",
        "Positions partner as a leader in AI/ML implementation."
    ],
    customerBenefit: [
        "Credits to cover expensive GPU/Training costs.",
        "Access to Bedrock/SageMaker expertise at reduced cost.",
        "Accelerate Proof of Concept to Production timeline."
    ],
    exampleScenario: 'A law firm wants to build a secure chatbot that answers questions based on their private legal documents.'
  },
  {
    id: 'poc',
    name: 'Standard Proof of Concept (PoC)',
    category: 'General',
    description: 'Try before you buy. General funding to test if AWS works for your specific need.',
    eligibility: 'Any workload where technical validation is needed to close the sale.',
    requirements: [
      "Technical validation required before production commit",
      "New workload or service testing",
      "Partner-led execution",
      "Credits expire if not used within the PoC period (usually 3 months)"
    ],
    partnerBenefit: [
        "AWS covers ~10% of deal value to fund the test.",
        "Removes financial friction during technical validation."
    ],
    customerBenefit: [
        "Test AWS solutions risk-free before signing contracts.",
        "Credits cover the infrastructure usage during testing.",
        "Validate performance and security requirements."
    ],
    exampleScenario: 'A university wants to test if Amazon AppStream works for remote learning before buying it for 5,000 students.'
  },
  {
    id: 'wmp',
    name: 'ISV Workload Migration Program (WMP)',
    category: 'Migration',
    description: 'For Software Vendors (ISVs). Helps them move their own customers from on-premise versions to their cloud SaaS version.',
    eligibility: 'For ISVs who have a SaaS product on AWS.',
    requirements: [
      "Partner must be an ISV with a SaaS solution on AWS",
      "Customer must be migrating from On-Premise to SaaS",
      "Must demonstrate data migration costs",
      "Outcome is a new SaaS subscription"
    ],
    partnerBenefit: [
        "Funding to migrate customers from On-Prem software to SaaS.",
        "Accelerates SaaS revenue recognition."
    ],
    customerBenefit: [
        "Lower migration fees when moving to vendor's SaaS version.",
        "Seamless transition managed by the software vendor."
    ],
    exampleScenario: 'An ERP software vendor offers a "Free Migration" to their cloud version because AWS WMP pays for the data transfer costs.'
  },
  {
    id: 'edp',
    name: 'Enterprise Discount Program (EDP)',
    category: 'Enterprise',
    description: 'A bulk discount contract. You promise to spend a certain amount, and AWS gives you a flat discount on everything.',
    eligibility: 'For spenders over $1 Million per year. Requires a 1-5 year contract.',
    requirements: [
      "Annual AWS spend > $1 Million",
      "Commitment to a 1-5 year term",
      "Pre-payment or monthly commitment required",
      "Legal contract negotiation required"
    ],
    partnerBenefit: [
        "Locks in customer commit for 3-5 years.",
        "Opportunity to attach multi-year managed services."
    ],
    customerBenefit: [
        "Guaranteed flat discount (10-18%+) on all AWS spend.",
        "Predictable billing and long-term cost savings.",
        "Enterprise Support included in the contract."
    ],
    exampleScenario: 'A video streaming giant commits to spending $10M over 3 years and gets a flat 13% discount on all their bills.'
  }
];
