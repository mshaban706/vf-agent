/** Multi-agent workflow pipelines — additive, does not replace single-agent runs. */
export interface PipelineDefinition {
  id: string;
  name: string;
  description: string;
  agent_slugs: string[];
  final_deliverables: string[];
}

export const VF_PIPELINES: PipelineDefinition[] = [
  {
    id: 'new-website-seo-research',
    name: 'New Website SEO Research Pipeline',
    description: 'Full Valiant Firm research stack from document context through QA.',
    agent_slugs: [
      'manager',
      'document-context',
      'keyword-research',
      'competitor-research',
      'local-seo',
      'semantic-seo',
      'topical-authority',
      'content-seo',
      'technical-seo',
      'cro',
      'ai-visibility',
      'schema-strategy',
      'internal-linking',
      'reporting',
      'qa',
    ],
    final_deliverables: [
      'research summary',
      'keywords',
      'competitors',
      'topical map',
      'service pages',
      'city pages',
      'blog plan',
      'GBP plan',
      'schema plan',
      'internal links',
      'KPIs',
      '30/60/90 roadmap',
    ],
  },
  {
    id: 'local-seo-expansion',
    name: 'Local SEO Expansion Pipeline',
    description: 'Hub/spoke local expansion with GBP, citations, and entity optimization.',
    agent_slugs: ['manager', 'local-seo', 'local-entity', 'gbp-optimization', 'citation-building', 'review-growth', 'content-seo', 'qa'],
    final_deliverables: ['local expansion plan', 'GBP optimization', 'citation plan', 'city pages', 'review strategy'],
  },
  {
    id: 'google-ads-launch',
    name: 'Google Ads Launch Pipeline',
    description: 'Campaign structure aligned with SEO and landing pages.',
    agent_slugs: ['manager', 'keyword-research', 'google-ads', 'paid-ads-strategy', 'landing-page-architecture', 'cro', 'qa'],
    final_deliverables: ['campaign structure', 'ad groups', 'keywords', 'negatives', 'landing page map'],
  },
  {
    id: 'seo-audit',
    name: 'SEO Audit Pipeline',
    description: 'Technical + on-page + schema audit with prioritized fixes.',
    agent_slugs: ['manager', 'seo-audit', 'technical-seo', 'on-page-seo', 'schema-strategy', 'internal-linking', 'qa'],
    final_deliverables: ['audit report', 'priority fixes', 'developer instructions'],
  },
  {
    id: 'content-brief',
    name: 'Content Brief Pipeline',
    description: 'Semantic content brief with E-E-A-T and entity coverage.',
    agent_slugs: ['document-context', 'keyword-research', 'semantic-seo', 'entity-seo', 'content-seo', 'eeat', 'qa'],
    final_deliverables: ['content brief', 'heading structure', 'EAV map', 'internal links', 'schema'],
  },
  {
    id: 'monthly-reporting',
    name: 'Monthly Reporting Pipeline',
    description: 'Client-ready monthly SEO report.',
    agent_slugs: ['reporting', 'client-reporting-writer', 'research-validation', 'qa'],
    final_deliverables: ['monthly report', 'KPI summary', '30-day focus', 'wins and risks'],
  },
  {
    id: 'gbp-optimization',
    name: 'GBP Optimization Pipeline',
    description: 'Full GBP profile optimization workflow.',
    agent_slugs: ['local-seo', 'gbp-optimization', 'review-growth', 'content-seo', 'qa'],
    final_deliverables: ['GBP categories', 'services', 'posts', 'Q&A', 'review plan'],
  },
  {
    id: 'programmatic-city-pages',
    name: 'Programmatic City Page Pipeline',
    description: 'Scalable city/service page architecture.',
    agent_slugs: ['programmatic-seo', 'keyword-research', 'content-seo', 'schema-strategy', 'internal-linking', 'qa'],
    final_deliverables: ['URL patterns', 'template spec', 'city page matrix', 'internal link rules'],
  },
  {
    id: 'ai-visibility-geo',
    name: 'AI Visibility / GEO Pipeline',
    description: 'AEO/GEO/AI Overview optimization workflow.',
    agent_slugs: ['ai-visibility', 'query-context', 'information-gain', 'content-seo', 'schema-strategy', 'qa'],
    final_deliverables: ['AEO targets', 'GEO blocks', 'FAQ schema', 'answer-ready content'],
  },
  {
    id: 'link-building-campaign',
    name: 'Link Building Campaign Pipeline',
    description: 'Local and niche link acquisition plan.',
    agent_slugs: ['link-building', 'competitor-research', 'digital-pr', 'qa'],
    final_deliverables: ['prospect list', 'outreach templates', 'anchor plan', 'risk notes'],
  },
  {
    id: 'vf-researching-mode',
    name: 'VF Researching Mode — SEO Master Workbook',
    description:
      'Full Valiant Firm 95+ research workflow producing a complete SEO Master Excel workbook with 34+ tabs.',
    agent_slugs: [
      'manager',
      'research-validation',
      'document-context',
      'keyword-research',
      'competitor-research',
      'local-seo',
      'content-seo',
      'semantic-seo',
      'entity-seo',
      'ai-visibility',
      'technical-seo',
      'internal-linking',
      'schema-strategy',
      'cro',
      'google-ads',
      'link-building',
      'citation-building',
      'review-growth',
      'programmatic-seo',
      'reporting',
      'qa',
    ],
    final_deliverables: [
      'VF SEO Master Excel workbook',
      'Executive Dashboard',
      'Master Keywords',
      'Competitor Matrix',
      'Website Audit',
      'AEO/GEO plan',
      '30/60/90 roadmap',
      'KPI dashboard',
      'Final QA score 95+',
    ],
  },
];

export function getPipelineById(id: string): PipelineDefinition | undefined {
  return VF_PIPELINES.find((p) => p.id === id);
}
