/**
 * Zoho Product Catalog
 * ---------------------
 * Transcribed from the internal "ZOHO PRODUCTS.wps" reference document.
 * Grouped by Zoho business function (the same categorisation used in the doc).
 *
 * Each product carries:
 *  - name:         product name as marketed by Zoho
 *  - keyFeatures:  headline capabilities
 *  - businessUse:  "Workability / Business Use" — i.e. the problem the product solves.
 *                  This is the primary signal used to map a product to a company's
 *                  pain points / needs during analysis.
 *
 * This catalog is injected (compactly) into the Gemini prompt so the model can
 * select the products that genuinely fit an analysed company.
 */

export interface ZohoCatalogProduct {
  name: string;
  keyFeatures: string;
  businessUse: string;
}

export interface ZohoCatalogCategory {
  category: string;
  products: ZohoCatalogProduct[];
}

export const ZOHO_CATALOG: ZohoCatalogCategory[] = [
  {
    category: "Sales",
    products: [
      { name: "Zoho CRM", keyFeatures: "Lead Management, Contact Management, Deal Tracking, Workflow Automation, Sales Forecasting, Email Integration, Reports & Dashboards, AI Assistant (Zia)", businessUse: "Manages the complete sales cycle, automates follow-ups, improves productivity, and increases conversion rates." },
      { name: "Zoho Bigin", keyFeatures: "Pipeline Management, Contact Management, Email Integration, Activity Tracking, Mobile App, Workflow Automation", businessUse: "Helps small businesses organize customer interactions and manage sales pipelines." },
      { name: "Zoho SalesIQ", keyFeatures: "Live Chat, Chatbots, Visitor Tracking, Lead Scoring, Visitor Analytics, Screen Sharing, CRM Integration", businessUse: "Engages website visitors, captures leads, and improves conversion rates." },
      { name: "Zoho Forms", keyFeatures: "Drag-and-Drop Form Builder, Conditional Logic, Approval Workflows, E-signatures, Payment Collection, Integrations", businessUse: "Automates data collection and reduces manual entry." },
      { name: "Zoho RouteIQ", keyFeatures: "Route Optimization, Territory Mapping, Visit Planning, Navigation Assistance, Field Tracking", businessUse: "Optimizes field sales routes and increases customer coverage." },
      { name: "Zoho Bookings", keyFeatures: "Online Appointment Scheduling, Calendar Sync, Automated Reminders, Team Scheduling", businessUse: "Automates appointment scheduling and eliminates manual coordination." },
      { name: "Zoho Thrive", keyFeatures: "Loyalty Programs, Rewards Management, Referral Programs, Customer Segmentation, Engagement Tracking", businessUse: "Improves customer retention and repeat purchases." },
      { name: "Zoho POS", keyFeatures: "Billing & Checkout, Inventory Management, Customer Profiles, Multi-store Management, Sales Reports", businessUse: "Manages retail operations, billing, inventory, and store performance." },
      { name: "Zoho DAP", keyFeatures: "In-App Guidance, Interactive Walkthroughs, User Onboarding, User Analytics, Training Assistance", businessUse: "Improves software adoption and reduces training time." }
    ]
  },
  {
    category: "Marketing",
    products: [
      { name: "Zoho Campaigns", keyFeatures: "Email Campaigns, Automation, Templates, Segmentation, A/B Testing, Analytics", businessUse: "Creates and automates email marketing campaigns to nurture leads and improve conversions." },
      { name: "Zoho Social", keyFeatures: "Social Media Scheduling, Monitoring, Brand Mentions, Analytics, Collaboration", businessUse: "Manages social media accounts, schedules posts, and tracks engagement." },
      { name: "Zoho Sign", keyFeatures: "Digital Signatures, Approval Workflows, Audit Trails, Templates", businessUse: "Enables secure electronic document signing and approval automation." },
      { name: "Zoho Backstage", keyFeatures: "Event Registration, Ticketing, Event Website, Check-ins, Analytics", businessUse: "Manages online, offline, and hybrid events." },
      { name: "Zoho Survey", keyFeatures: "Survey Builder, Templates, Analytics, CRM Integration", businessUse: "Collects customer and employee feedback." },
      { name: "Zoho Marketing Automation", keyFeatures: "Lead Scoring, Journey Builder, Segmentation, Multi-channel Marketing", businessUse: "Automates lead nurturing and customer engagement." },
      { name: "Zoho Sites", keyFeatures: "Website Builder, SEO Tools, Templates, Mobile Optimization", businessUse: "Builds business websites without coding." },
      { name: "Zoho Webinar", keyFeatures: "Live Webinars, Registration Management, Polls, Q&A, Analytics", businessUse: "Conducts webinars, demos, and virtual events." },
      { name: "Zoho PageSense", keyFeatures: "Heatmaps, Session Recording, A/B Testing, Funnel Analysis", businessUse: "Optimizes website performance and conversions." },
      { name: "Zoho LandingPage", keyFeatures: "Landing Page Builder, Lead Forms, Analytics, Templates", businessUse: "Creates conversion-focused campaign landing pages." },
      { name: "Zoho LeadChain", keyFeatures: "Lead Capture, Visitor Identification, CRM Integration", businessUse: "Captures and routes leads to sales teams." },
      { name: "Zoho Domains", keyFeatures: "Domain Registration, DNS Management, Security", businessUse: "Manages business domains and DNS settings." },
      { name: "Zoho CommunitySpaces", keyFeatures: "Forums, Member Management, Discussions, Moderation", businessUse: "Builds customer and partner communities." },
      { name: "Zoho Publish", keyFeatures: "Content Publishing, Distribution, Analytics", businessUse: "Publishes and distributes content across channels." },
      { name: "Zoho Marketing Plus", keyFeatures: "Unified Dashboard, Campaign Management, Attribution Reporting", businessUse: "Centralizes all marketing activities." }
    ]
  },
  {
    category: "Commerce and POS",
    products: [
      { name: "Zoho POS", keyFeatures: "Billing, Inventory Management, Multi-store Management, Reports", businessUse: "Manages retail sales and inventory operations." },
      { name: "Zoho Commerce", keyFeatures: "Online Store Builder, Product Catalog, Payment Gateway, Order Management", businessUse: "Builds and manages e-commerce stores." }
    ]
  },
  {
    category: "Service",
    products: [
      { name: "Zoho Desk", keyFeatures: "Ticket Management, Omnichannel Support, SLA Management, Knowledge Base, Workflow Automation, AI Assistant (Zia), Customer Portal", businessUse: "Manages customer support requests across multiple channels and improves response and resolution times." },
      { name: "Zoho Assist", keyFeatures: "Remote Access, Unattended Access, Screen Sharing, File Transfer, Remote Troubleshooting", businessUse: "Allows IT teams and support agents to remotely access devices and resolve issues quickly." },
      { name: "Zoho SalesIQ", keyFeatures: "Live Chat, Chatbots, Visitor Tracking, Lead Scoring, Visitor Analytics", businessUse: "Provides real-time customer engagement, support, and lead generation from websites." },
      { name: "Zoho Bookings", keyFeatures: "Appointment Scheduling, Calendar Sync, Automated Reminders, Team Scheduling", businessUse: "Automates appointment booking and eliminates scheduling conflicts." },
      { name: "Zoho FSM", keyFeatures: "Work Order Management, Scheduling, Dispatching, GPS Tracking, Service Reports, Mobile App", businessUse: "Manages field technicians, service visits, maintenance requests, and customer service operations." },
      { name: "Zoho Lens", keyFeatures: "Augmented Reality Support, Live Video Assistance, Remote Inspection, Annotation Tools", businessUse: "Provides remote visual assistance and troubleshooting using AR technology." },
      { name: "Zoho Service Plus", keyFeatures: "Integrated Help Desk, Remote Support, Field Service, Analytics, Customer Feedback", businessUse: "Combines customer support, field service, and remote assistance into a unified service platform." }
    ]
  },
  {
    category: "Finance",
    products: [
      { name: "Zoho Books", keyFeatures: "Accounting, GST Compliance, Invoicing, Bank Reconciliation, Financial Reports, Automation", businessUse: "Manages end-to-end accounting, bookkeeping, tax compliance, and financial reporting." },
      { name: "Zoho Expense", keyFeatures: "Expense Tracking, Receipt Scanning, Approval Workflows, Mileage Tracking, Corporate Cards", businessUse: "Automates employee expense reporting and reimbursement processes." },
      { name: "Zoho Payroll", keyFeatures: "Payroll Processing, Salary Management, Tax Compliance, Payslips, Employee Self-Service", businessUse: "Automates payroll calculations, salary disbursement, and statutory compliance." },
      { name: "Zoho Inventory", keyFeatures: "Inventory Tracking, Warehouse Management, Order Management, Purchase Orders, Stock Alerts", businessUse: "Manages stock levels, warehouses, orders, and inventory operations efficiently." },
      { name: "Zoho Sign", keyFeatures: "Digital Signatures, Approval Workflows, Audit Trails, Templates, Compliance", businessUse: "Enables secure document signing and approval management." },
      { name: "Zoho Billing", keyFeatures: "Subscription Billing, Recurring Invoices, Payment Collection, Revenue Tracking", businessUse: "Automates subscription management and recurring billing processes." },
      { name: "Zoho Commerce", keyFeatures: "Online Store Builder, Product Catalog, Order Management, Inventory Sync, Payment Integration", businessUse: "Enables businesses to create and manage e-commerce stores." },
      { name: "Zoho Invoice", keyFeatures: "Professional Invoices, Payment Reminders, Client Portal, Expense Tracking", businessUse: "Simplifies invoicing and payment collection for freelancers and businesses." },
      { name: "Zoho Practice", keyFeatures: "Client Management, Document Management, Task Tracking, Time Tracking, Billing", businessUse: "Helps accounting firms manage clients, engagements, and compliance work." },
      { name: "Zoho Checkout", keyFeatures: "Payment Pages, Payment Collection, Subscription Support, Payment Integration", businessUse: "Allows businesses to accept online payments through customizable payment pages." },
      { name: "Zoho Payments", keyFeatures: "Payment Gateway Integration, Transaction Management, Payment Tracking", businessUse: "Centralizes online payment processing and reconciliation." },
      { name: "Zoho Spend", keyFeatures: "Procurement Controls, Corporate Spending Management, Budget Monitoring, Approvals", businessUse: "Tracks and controls organizational spending and purchasing activities." },
      { name: "Zoho ERP", keyFeatures: "Finance, Procurement, Inventory, Operations, Reporting, Workflow Automation", businessUse: "Integrates and manages core business processes across departments." },
      { name: "Zoho Procurement", keyFeatures: "Vendor Management, Purchase Requests, RFQs, Purchase Orders, Approval Workflows", businessUse: "Streamlines purchasing and supplier management processes." },
      { name: "Zoho Finance Plus", keyFeatures: "Unified Finance Dashboard, Books, Inventory, Expense, Billing, Analytics", businessUse: "Provides a complete financial management ecosystem for growing businesses." }
    ]
  },
  {
    category: "Email, Storage and Collaboration",
    products: [
      { name: "Zoho Mail", keyFeatures: "Business Email, Custom Domain, Email Hosting, Security, Calendar Integration", businessUse: "Provides secure business email communication and collaboration." },
      { name: "Zoho WorkDrive", keyFeatures: "Cloud Storage, File Sharing, Team Folders, Version Control", businessUse: "Centralizes document storage and team collaboration." },
      { name: "Zoho Sign", keyFeatures: "Digital Signatures, Audit Trail, Approval Workflows", businessUse: "Enables secure electronic document signing." },
      { name: "Zoho Connect", keyFeatures: "Intranet, Employee Communities, Forums, Announcements", businessUse: "Improves internal communication and employee engagement." },
      { name: "Zoho Cliq", keyFeatures: "Instant Messaging, Channels, Audio/Video Calls, Bots", businessUse: "Facilitates team communication and collaboration." },
      { name: "Zoho ZeptoMail", keyFeatures: "Transactional Emails, SMTP Service, Email Analytics", businessUse: "Ensures reliable delivery of transactional emails." },
      { name: "Zoho Meeting", keyFeatures: "Online Meetings, Web Conferencing, Screen Sharing, Recording", businessUse: "Conducts virtual meetings and collaboration sessions." },
      { name: "Zoho Learn", keyFeatures: "Knowledge Base, Training Management, Learning Paths", businessUse: "Supports employee training and knowledge sharing." },
      { name: "Zoho TeamInbox", keyFeatures: "Shared Inbox, Email Assignment, Collaboration, Analytics", businessUse: "Manages group email communication efficiently." },
      { name: "Zoho Office Integrator", keyFeatures: "Document Editing APIs, Embedding, Collaboration", businessUse: "Integrates office productivity tools into business applications." },
      { name: "Zoho Writer", keyFeatures: "Word Processing, Collaboration, Templates, E-signatures", businessUse: "Creates and collaborates on business documents." },
      { name: "Zoho Tables", keyFeatures: "No-Code Work Management, Custom Databases, Automation", businessUse: "Organizes and manages structured business data." },
      { name: "Zoho Notebook", keyFeatures: "Note Taking, Multimedia Notes, Sync Across Devices", businessUse: "Captures and organizes personal and business notes." },
      { name: "Zoho Show", keyFeatures: "Presentation Builder, Collaboration, Templates", businessUse: "Creates professional presentations." },
      { name: "Zoho Calendar", keyFeatures: "Scheduling, Event Management, Shared Calendars", businessUse: "Coordinates meetings, tasks, and schedules." },
      { name: "Zoho ToDo", keyFeatures: "Task Management, Reminders, Prioritization, Tracking", businessUse: "Organizes and tracks personal and team tasks." },
      { name: "Zoho PDF Editor", keyFeatures: "PDF Editing, Annotation, Form Filling, Document Management", businessUse: "Creates, edits, and manages PDF documents." },
      { name: "Zoho Workplace", keyFeatures: "Email, Chat, Meetings, File Management, Office Apps", businessUse: "Provides a complete collaboration and productivity platform for businesses." }
    ]
  },
  {
    category: "Human Resources",
    products: [
      { name: "Zoho People", keyFeatures: "HR Management, Attendance, Leave Management, Performance Reviews, Employee Database", businessUse: "Automates HR operations and manages the complete employee lifecycle from onboarding to exit." },
      { name: "Zoho Recruit", keyFeatures: "Applicant Tracking System, Resume Parsing, Job Posting, Interview Scheduling, Candidate Portal", businessUse: "Streamlines recruitment and hiring by managing candidates, interviews, and job openings." },
      { name: "Zoho Payroll", keyFeatures: "Payroll Processing, Payslips, Tax Compliance, Salary Management, Employee Self-Service", businessUse: "Automates salary processing, statutory compliance, and payroll administration." },
      { name: "Zoho Expense", keyFeatures: "Expense Reporting, Receipt Scanning, Approval Workflows, Reimbursements", businessUse: "Simplifies employee expense tracking and reimbursement management." },
      { name: "Zoho Sign", keyFeatures: "Digital Signatures, Approval Workflows, Audit Trails, Document Templates", businessUse: "Enables secure digital signing of HR documents, contracts, and employee agreements." },
      { name: "Zoho Connect", keyFeatures: "Employee Intranet, Communities, Announcements, Forums, Collaboration", businessUse: "Improves employee communication, engagement, and organizational collaboration." },
      { name: "Zoho Learn", keyFeatures: "Knowledge Base, Learning Paths, Training Programs, Assessments", businessUse: "Supports employee onboarding, training, and continuous learning." },
      { name: "Zoho Workerly", keyFeatures: "Temporary Workforce Management, Scheduling, Timesheets, Client Management", businessUse: "Helps staffing agencies manage temporary workers, shifts, and assignments." },
      { name: "Zoho Shifts", keyFeatures: "Shift Scheduling, Time Tracking, Attendance Monitoring, Workforce Planning", businessUse: "Optimizes workforce scheduling and improves staff utilization." },
      { name: "Zoho People Plus", keyFeatures: "People, Recruit, Payroll, Learn, Connect, Analytics Integration", businessUse: "Provides a unified HR ecosystem for workforce management, recruitment, learning, collaboration, and employee experience." }
    ]
  },
  {
    category: "Legal",
    products: [
      { name: "Zoho Sign", keyFeatures: "Secure, legally compliant digital signing with automated audit trails.", businessUse: "Upload a final document, drop signature tags, and route it to recipients for instant execution." },
      { name: "Zoho Contracts", keyFeatures: "End-to-end contract lifecycle management with built-in drafting, internal workflows, and milestone tracking.", businessUse: "Generate agreements from templates, collaborate on live revisions with clients, sign natively, and track renewals automatically." }
    ]
  },
  {
    category: "Security and IT Management",
    products: [
      { name: "Zoho Vault", keyFeatures: "Password Management, Secure Password Sharing, Access Control, Password Generator, Audit Trails", businessUse: "Securely stores and manages business passwords, credentials, and sensitive information in one centralized vault." },
      { name: "Zoho Creator", keyFeatures: "Low-Code App Development, Drag-and-Drop Builder, Workflow Automation, Custom Forms, Reports & Dashboards", businessUse: "Enables businesses to build custom applications and automate processes without extensive coding." },
      { name: "Zoho Assist", keyFeatures: "Remote Access, Unattended Access, Screen Sharing, File Transfer, Multi-Device Support", businessUse: "Allows IT teams to remotely troubleshoot, manage, and support computers and devices." },
      { name: "Zoho Lens", keyFeatures: "Augmented Reality (AR) Support, Remote Assistance, Live Video Streaming, Annotation Tools, Session Recording", businessUse: "Enables field technicians and support teams to provide remote visual assistance and troubleshooting." },
      { name: "Zoho eProtect", keyFeatures: "Email Authentication, DMARC Management, SPF & DKIM Monitoring, Threat Detection, Compliance Reporting", businessUse: "Protects organizations from email spoofing, phishing attacks, and domain abuse." },
      { name: "Zoho Catalyst", keyFeatures: "Serverless Computing, API Management, Microservices, Cloud Functions, Application Hosting", businessUse: "Provides a developer platform to build, deploy, and scale cloud-native applications quickly." },
      { name: "Zoho RPA", keyFeatures: "Robotic Process Automation, Task Automation, Workflow Orchestration, Bot Management, Process Recording", businessUse: "Automates repetitive manual tasks across applications to improve productivity and reduce errors." },
      { name: "Zoho QEngine", keyFeatures: "Automated Testing, Test Case Management, Cross-Browser Testing, Performance Testing, CI/CD Integration", businessUse: "Helps QA teams automate software testing and ensure application quality." },
      { name: "Zoho OneAuth", keyFeatures: "Multi-Factor Authentication (MFA), Passwordless Login, OTP Generation, Biometric Authentication, Secure Sign-In", businessUse: "Enhances account security by providing strong authentication methods for Zoho applications." },
      { name: "Zoho Toolkit", keyFeatures: "Developer Utilities, SDKs, APIs, Integration Tools, Application Management Resources", businessUse: "Helps developers build integrations, extensions, and custom solutions within the Zoho ecosystem." },
      { name: "Zoho Directory", keyFeatures: "Identity & Access Management, Single Sign-On (SSO), User Provisioning, Multi-Factor Authentication, Directory Synchronization", businessUse: "Centralizes user identity management and provides secure access to applications across the organization." }
    ]
  },
  {
    category: "BI and Analytics",
    products: [
      { name: "Zoho Analytics", keyFeatures: "AI-powered business intelligence, reporting, and dashboards", businessUse: "Analyzes data from multiple sources to provide actionable insights and support data-driven decision-making." },
      { name: "Zoho DataPrep", keyFeatures: "Automated data cleansing and transformation", businessUse: "Prepares, cleans, and enriches raw data to improve reporting accuracy and analytics quality." },
      { name: "Zoho Embedded BI", keyFeatures: "White-label embedded analytics and dashboards", businessUse: "Integrates interactive reports and dashboards directly into applications, portals, and customer-facing products." },
      { name: "Zoho AI Dashboard Generator", keyFeatures: "AI-generated dashboards using natural language prompts", businessUse: "Automatically creates dashboards, visualizations, and insights from business data with minimal manual effort." }
    ]
  }
];

/**
 * Compact representation for LLM prompting — flattens to
 * "Category | Product — businessUse" lines to minimise tokens while
 * preserving the mapping signal (category + business use).
 */
export const buildZohoCatalogPromptText = (): string =>
  ZOHO_CATALOG.map(
    (cat) =>
      `## ${cat.category}\n` +
      cat.products
        .map((p) => `- ${p.name}: ${p.businessUse} (Features: ${p.keyFeatures})`)
        .join("\n")
  ).join("\n\n");

/** Flat list of valid product names (for optional validation). */
export const ZOHO_PRODUCT_NAMES: string[] = Array.from(
  new Set(ZOHO_CATALOG.flatMap((c) => c.products.map((p) => p.name)))
);
