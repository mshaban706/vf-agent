/** VF Researching Mode — global trigger for 95+ SEO Master workbook generation. */

export const VF_RESEARCH_PIPELINE_ID = 'vf-researching-mode';

export const RESEARCH_TRIGGER_PHRASES = [
  'researching',
  'full research',
  'seo research',
  'keyword research',
  'competitor research',
  'new website research',
  'local seo research',
  'market research',
  'full seo sheet',
  'master seo sheet',
  'valiant firm research sheet',
];

export interface ResearchBrief {
  clientName: string;
  website: string;
  industry: string;
  services: string[];
  mainLocation: string;
  targetLocations: string[];
  radius: string;
  competitors: string[];
  goal: string;
  notes: string;
  missingFields: string[];
  researchDate: string;
}

const BRIEF_FIELD_PATTERNS: Array<{ key: keyof ResearchBrief; patterns: RegExp[] }> = [
  { key: 'clientName', patterns: [/client\s*\/\s*business\s*name\s*:\s*(.+)/i, /business\s*name\s*:\s*(.+)/i] },
  { key: 'website', patterns: [/website\s*:\s*(.+)/i] },
  { key: 'industry', patterns: [/industry\s*:\s*(.+)/i] },
  { key: 'mainLocation', patterns: [/main\s*location\s*:\s*(.+)/i] },
  { key: 'radius', patterns: [/radius\s*:\s*(.+)/i] },
  { key: 'goal', patterns: [/primary\s*goal\s*:\s*(.+)/i, /goal\s*:\s*(.+)/i] },
  { key: 'notes', patterns: [/notes\s*:\s*(.+)/i] },
];

function extractField(text: string, patterns: RegExp[]): string {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return '';
}

function splitList(value: string): string[] {
  return value
    .split(/[,;|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isVFResearchingMode(command: string): boolean {
  const lower = command.toLowerCase();
  return RESEARCH_TRIGGER_PHRASES.some((phrase) => lower.includes(phrase));
}

export function parseResearchBrief(
  command: string,
  clientContext?: Record<string, unknown>,
): ResearchBrief {
  const missingFields: string[] = [];

  let clientName = extractField(command, BRIEF_FIELD_PATTERNS.find((f) => f.key === 'clientName')!.patterns);
  let website = extractField(command, BRIEF_FIELD_PATTERNS.find((f) => f.key === 'website')!.patterns);
  let industry = extractField(command, BRIEF_FIELD_PATTERNS.find((f) => f.key === 'industry')!.patterns);
  let mainLocation = extractField(command, BRIEF_FIELD_PATTERNS.find((f) => f.key === 'mainLocation')!.patterns);
  let radius = extractField(command, BRIEF_FIELD_PATTERNS.find((f) => f.key === 'radius')!.patterns);
  let goal = extractField(command, BRIEF_FIELD_PATTERNS.find((f) => f.key === 'goal')!.patterns);
  let notes = extractField(command, BRIEF_FIELD_PATTERNS.find((f) => f.key === 'notes')!.patterns);

  const servicesRaw = command.match(/services\s*:\s*(.+)/i)?.[1] ?? '';
  const targetsRaw = command.match(/target\s*locations\s*:\s*(.+)/i)?.[1] ?? '';
  const competitorsRaw = command.match(/competitors\s*:\s*(.+)/i)?.[1] ?? '';

  if (clientContext) {
    clientName = clientName || String(clientContext.name ?? '');
    website = website || String(clientContext.domain ?? '');
    industry = industry || String(clientContext.industry ?? '');
    mainLocation = mainLocation || String(clientContext.service_area ?? clientContext.main_location ?? '');
    radius = radius || (clientContext.radius_miles ? `${clientContext.radius_miles} miles` : '');
  }

  if (!clientName) {
    const domainMatch = website.match(/(?:https?:\/\/)?(?:www\.)?([^./]+)/);
    if (domainMatch) clientName = domainMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  if (!clientName) missingFields.push('Client / Business Name');
  if (!website) missingFields.push('Website');
  if (!industry) missingFields.push('Industry');
  if (!mainLocation) missingFields.push('Main Location');

  const services = splitList(servicesRaw);
  const targetLocations = splitList(targetsRaw);
  const competitors = splitList(competitorsRaw);

  if (!services.length) missingFields.push('Services');
  if (!targetLocations.length && mainLocation) targetLocations.push(mainLocation);
  if (!targetLocations.length) missingFields.push('Target Locations');
  if (!goal) {
    goal = 'Increase qualified organic leads and local visibility';
    missingFields.push('Goal (inferred)');
  }

  return {
    clientName: clientName || 'Client',
    website: website || 'Needs Validation',
    industry: industry || 'Local Service Business',
    services: services.length ? services : ['Core Services — Needs Validation'],
    mainLocation: mainLocation || 'Needs Validation',
    targetLocations,
    radius: radius || '50 miles (recommended core — validate broad radius)',
    competitors,
    goal,
    notes: notes || command.slice(0, 500),
    missingFields,
    researchDate: new Date().toISOString().slice(0, 10),
  };
}

export function getWorkbookFileName(clientName: string, industry: string): string {
  const safe = (s: string) =>
    s
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40);
  return `VF_${safe(clientName)}_${safe(industry)}_SEO_Master.xlsx`;
}

/** Maps agent slug → primary workbook tabs they must populate in JSON output. */
export const AGENT_SHEET_ASSIGNMENTS: Record<string, string[]> = {
  manager: ['Executive Dashboard', '30-60-90 Roadmap', 'Implementation Tracker', 'Final QA Score'],
  'research-validation': ['Source Evidence', 'Validation Notes'],
  'document-context': ['Source Evidence', 'Validation Notes'],
  'keyword-research': ['Master Keywords', 'Near Me Keywords'],
  'competitor-research': ['Competitor Matrix', 'Competitor Weak Points'],
  'local-seo': ['Market Grouping', 'GBP Optimization', 'City Location Pages'],
  'local-entity': ['Market Grouping', 'City Location Pages'],
  'content-seo': ['Website Architecture', 'Service Pages', 'Blog Calendar', 'Content Briefs'],
  'semantic-seo': ['Semantic SEO Topical Map', 'Entity SEO Map'],
  'entity-seo': ['Entity SEO Map'],
  'topical-authority': ['Semantic SEO Topical Map'],
  'ai-visibility': ['AEO GEO AI Visibility'],
  'technical-seo': ['Website Audit', 'Website Gap Analysis', 'Technical SEO Checklist'],
  'seo-audit': ['Website Audit', 'Website Gap Analysis'],
  'internal-linking': ['Internal Linking Map'],
  'schema-strategy': ['Schema Strategy'],
  cro: ['CRO Strategy'],
  'google-ads': ['Google Ads Alignment'],
  'link-building': ['Backlink Strategy', 'Citation Strategy'],
  'gbp-optimization': ['GBP Optimization'],
  'review-growth': ['Review Strategy'],
  'citation-building': ['Citation Strategy'],
  'programmatic-seo': ['Programmatic SEO Plan'],
  reporting: ['KPI Dashboard', 'Cost Dashboard'],
  qa: ['Final QA Score'],
};

export function getResearchAgentPromptSuffix(agentSlug: string): string {
  const sheets = AGENT_SHEET_ASSIGNMENTS[agentSlug] ?? [];
  if (!sheets.length) return '';

  return `

VF RESEARCHING MODE ACTIVE — You are building data for a Valiant Firm 95+ SEO Master Excel workbook.
Your assigned tabs: ${sheets.join(', ')}.

Return your response as markdown PLUS a fenced JSON block:
\`\`\`json
{
  "sheets": {
    "${sheets[0]}": [ { "column_name": "value", ... } ]
  },
  "assumptions": [],
  "validation_notes": []
}
\`\`\`

Rules:
- Populate REALISTIC, client-specific rows (minimum 8 rows per assigned tab unless tab is summary-only).
- Label metrics as Live Verified, Tool Estimated, AI Estimated, or Needs Validation.
- Never fabricate Ahrefs/Semrush/GSC live metrics — use AI Estimated or Needs Validation.
- Include page mapping, intent, funnel stage, and priority for keywords/content.
- Flag local SEO radius risks when service area is broad.
`;
}
