/** Valiant Firm Intelligence Framework — 50 core skills mapped to agents. */
export const VF_SKILLS = [
  { id: 'seo-strategy', name: 'SEO Strategy', category: 'strategy' },
  { id: 'local-seo', name: 'Local SEO', category: 'local' },
  { id: 'technical-seo', name: 'Technical SEO', category: 'technical' },
  { id: 'on-page-seo', name: 'On-Page SEO', category: 'content' },
  { id: 'content-seo', name: 'Content SEO', category: 'content' },
  { id: 'keyword-research', name: 'Keyword Research', category: 'research' },
  { id: 'competitor-research', name: 'Competitor Research', category: 'research' },
  { id: 'programmatic-seo', name: 'Programmatic SEO', category: 'strategy' },
  { id: 'gbp-optimization', name: 'Google Business Profile Optimization', category: 'local' },
  { id: 'google-ads-alignment', name: 'Google Ads Strategy Alignment', category: 'paid' },
  { id: 'cro', name: 'Conversion Rate Optimization', category: 'conversion' },
  { id: 'seo-audits', name: 'SEO Audits', category: 'technical' },
  { id: 'seo-reporting', name: 'SEO Reporting', category: 'reporting' },
  { id: 'automation-seo', name: 'Automation-First SEO Systems', category: 'automation' },
  { id: 'paid-ads-strategy', name: 'Paid Ads Strategy', category: 'paid' },
  { id: 'full-funnel', name: 'Full-Funnel Marketing', category: 'strategy' },
  { id: 'semantic-seo', name: 'Semantic SEO', category: 'content' },
  { id: 'topical-authority', name: 'Topical Authority', category: 'content' },
  { id: 'source-context', name: 'Source Context', category: 'context' },
  { id: 'document-context', name: 'Document Context', category: 'context' },
  { id: 'query-context', name: 'Query Context', category: 'context' },
  { id: 'entity-seo', name: 'Entity SEO', category: 'content' },
  { id: 'eav-structure', name: 'Entity-Attribute-Value Structure', category: 'content' },
  { id: 'lexical-semantics', name: 'Lexical Semantics', category: 'content' },
  { id: 'contextual-internal-linking', name: 'Contextual Internal Linking', category: 'architecture' },
  { id: 'semantic-networks', name: 'Semantic Content Networks', category: 'architecture' },
  { id: 'information-gain', name: 'Information Gain', category: 'content' },
  { id: 'information-responsiveness', name: 'Information Responsiveness', category: 'content' },
  { id: 'eeat', name: 'E-E-A-T', category: 'trust' },
  { id: 'aeo', name: 'AEO / Answer Engine Optimization', category: 'ai-search' },
  { id: 'geo', name: 'GEO / Generative Engine Optimization', category: 'ai-search' },
  { id: 'ai-visibility', name: 'AI Visibility', category: 'ai-search' },
  { id: 'local-entity', name: 'Local Entity Optimization', category: 'local' },
  { id: 'schema-strategy', name: 'Schema Strategy', category: 'technical' },
  { id: 'internal-linking-architecture', name: 'Internal Linking Architecture', category: 'architecture' },
  { id: 'conversion-architecture', name: 'Conversion-Focused Page Architecture', category: 'conversion' },
  { id: 'review-strategy', name: 'Review Strategy', category: 'local' },
  { id: 'gbp-posting', name: 'GBP Posting Strategy', category: 'local' },
  { id: 'citation-strategy', name: 'Citation Strategy', category: 'local' },
  { id: 'link-building', name: 'Link Building Strategy', category: 'offpage' },
  { id: 'digital-pr', name: 'Digital PR', category: 'offpage' },
  { id: 'content-briefs', name: 'Content Brief Generation', category: 'content' },
  { id: 'topical-maps', name: 'Topical Map Generation', category: 'strategy' },
  { id: 'landing-architecture', name: 'Landing Page Architecture', category: 'conversion' },
  { id: 'reporting-dashboard', name: 'Reporting Dashboard Strategy', category: 'reporting' },
  { id: 'crm-workflows', name: 'CRM Workflow Strategy', category: 'automation' },
  { id: 'automation-workflows', name: 'Automation Workflow Strategy', category: 'automation' },
  { id: 'paid-landing-alignment', name: 'Paid Ads Landing Page Alignment', category: 'paid' },
  { id: 'lead-funnel', name: 'Lead Generation Funnel Strategy', category: 'conversion' },
  { id: 'quality-assurance', name: 'Quality Assurance / Final Review', category: 'qa' },
] as const;

export type VFSkillId = (typeof VF_SKILLS)[number]['id'];

export const VF_SKILL_IDS = VF_SKILLS.map((s) => s.id);

export const CONFIDENCE_LABELS = [
  'Live Verified',
  'Tool Estimated',
  'AI Estimated',
  'Needs Validation',
] as const;

export type ConfidenceLabel = (typeof CONFIDENCE_LABELS)[number];

export const TASK_OUTPUT_SECTIONS = [
  'Executive Summary',
  'Client Context Used',
  'Key Findings',
  'Strategic Recommendation',
  'Tactical Execution Table',
  'Priority Ranking',
  'Required Pages / Assets',
  'Internal Linking Plan',
  'Schema Plan',
  'AEO / GEO / AI Visibility Plan',
  'CRO / CTA Plan',
  'Local SEO / GBP Plan',
  'Paid Ads Alignment',
  'Automation Opportunities',
  'Risks / Warnings',
  'Missing Data',
  'Next 7 Days',
  'Next 30 Days',
  'Owner / Agent Responsibility',
  'Final QA Checklist',
] as const;

export const DEPTH_LEVELS = ['standard', 'advanced', 'vf95'] as const;
export type DepthLevel = (typeof DEPTH_LEVELS)[number];

export function getSkillName(id: string): string {
  return VF_SKILLS.find((s) => s.id === id)?.name ?? id;
}
