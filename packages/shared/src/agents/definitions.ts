import { buildAgentSystemPrompt, DATA_SOURCE_DISCLAIMER } from '../vf/agent-prompts';
import { getOutputSchemaHint } from '../vf/output-schemas';
import type { VFSkillId } from '../vf/vf-framework';

export interface AgentDefinition {
  slug: string;
  name: string;
  role: string;
  description: string;
  avatar_color: string;
  capabilities: string[];
  permission_scopes: string[];
  system_prompt: string;
  skills: VFSkillId[];
  tags: string[];
  output_schema_key: string;
  related_agents: string[];
  required_inputs: string[];
  optional_tools: string[];
  phase: number;
  prompt_version: string;
  uses_document_context: boolean;
}

function agent(
  slug: string,
  name: string,
  role: string,
  description: string,
  rolePrompt: string,
  opts: Partial<AgentDefinition> & { skills: VFSkillId[] },
): AgentDefinition {
  const schemaHint = getOutputSchemaHint(opts.output_schema_key ?? slug);
  return {
    slug,
    name,
    role,
    description,
    avatar_color: opts.avatar_color ?? '#D4AF37',
    capabilities: opts.capabilities ?? [],
    permission_scopes: opts.permission_scopes ?? ['read:web', 'write:outputs'],
    system_prompt: buildAgentSystemPrompt(`${rolePrompt}\n\n${DATA_SOURCE_DISCLAIMER}`, schemaHint),
    skills: opts.skills,
    tags: opts.tags ?? [],
    output_schema_key: opts.output_schema_key ?? slug,
    related_agents: opts.related_agents ?? [],
    required_inputs: opts.required_inputs ?? ['workspace', 'task'],
    optional_tools: opts.optional_tools ?? ['web-search'],
    phase: opts.phase ?? 1,
    prompt_version: 'vf-2.0',
    uses_document_context: opts.uses_document_context ?? true,
  };
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  agent('manager', 'Manager Agent', 'Orchestrator', 'Strategist and workflow controller — analyzes client, sequences agents, produces execution roadmap.', `Acts as Valiant Firm Manager Agent. Analyze client context, uploaded documents, and task goals. Choose the right specialist agents, sequence work, assign priority, detect missing data, and produce a 30/60/90 day execution roadmap with QA checklist. Output must include client summary, business model, location/service scope, growth objective, immediate risks, task sequence, agent assignment plan, and expected outputs.`, { skills: ['seo-strategy', 'automation-workflows', 'quality-assurance', 'document-context', 'source-context'], avatar_color: '#D4AF37', capabilities: ['planning', 'delegation', 'review', 'synthesis'], permission_scopes: ['read:all', 'write:tasks', 'assign:agents'], related_agents: ['document-context', 'keyword-research', 'content-seo', 'qa'], tags: ['core', 'orchestration'] }),

  agent('seo-strategy', 'SEO Strategy Agent', 'SEO Strategist', 'Creates SEO strategies, topical maps, gap analysis, internal linking, semantic/entity/AEO/GEO optimization.', `Create comprehensive SEO strategy: topical maps, content gaps, internal linking architecture, semantic SEO, entity optimization, programmatic opportunities, AEO/GEO, and 30/60/90 roadmap. Use uploaded sheet tabs (Roadmap, Master Clusters, KPIs) as primary intelligence.`, { skills: ['seo-strategy', 'topical-authority', 'semantic-seo', 'entity-seo', 'aeo', 'geo', 'internal-linking-architecture'], avatar_color: '#4ADE80', capabilities: ['topical_maps', 'gap_analysis', 'internal_linking', 'aeo_geo'], tags: ['strategy', 'seo'] }),

  agent('keyword-research', 'Keyword Research Agent', 'Keyword Analyst', 'Service, local, near-me, AEO/GEO, commercial intent keywords with regional clusters.', `Produce keyword clusters with primary/secondary/near-me/city/service/problem-solution/commercial/informational keywords, AEO questions, GEO prompts, AI Overview opportunities, intent, funnel stage, page mapping, priority score, difficulty estimate, and confidence labels. Use regional tabs from uploaded sheets (Gulf County, Panama City Metro, Tallahassee, Dothan, Albany). Regions: Wewahitchka, Gulf County, Panama City, Tallahassee, Dothan, Albany, etc.`, { skills: ['keyword-research', 'local-seo', 'aeo', 'geo', 'query-context', 'semantic-seo'], avatar_color: '#60A5FA', capabilities: ['service_keywords', 'local_keywords', 'intent_clustering', 'location_tabs'], tags: ['keywords', 'research'] }),

  agent('competitor-research', 'Competitor Research Agent', 'Competitive Analyst', 'Direct/local/organic/GBP/content/backlink competitors with gap analysis.', `Identify direct, local pack, organic, GBP, content, and backlink competitors. Analyze weak/strong points, ranking/content/schema/local/review/GBP/page architecture gaps. Provide opportunity score and action plan. Mark data as AI-estimated; recommend Ahrefs, Semrush, Ubersuggest, Local Falcon, BrightLocal, GSC, GBP Insights for validation.`, { skills: ['competitor-research', 'local-seo', 'link-building', 'information-gain'], avatar_color: '#F87171', capabilities: ['competitor_discovery', 'ranking_analysis', 'gap_reports'], tags: ['research', 'competitive'] }),

  agent('content-seo', 'Content SEO Agent', 'Content Strategist', 'Topical maps, service/city pages, blog clusters, EAV, schema, CTAs.', `Produce topical map, pillar/service/city pages, blog clusters, entity coverage, EAV structure, semantic terms, heading structure, content briefs, featured snippet blocks, FAQ blocks, schema suggestions, CTA placement, conversion sections, unique local content requirements. Reference Landing Pages, Service Pages, Blog Calendar tabs from uploaded sheets.`, { skills: ['content-seo', 'semantic-seo', 'topical-authority', 'entity-seo', 'eav-structure', 'eeat', 'schema-strategy', 'conversion-architecture'], avatar_color: '#A78BFA', capabilities: ['service_pages', 'city_pages', 'blog_outlines', 'faqs', 'eeat'], tags: ['content', 'seo'] }),

  agent('technical-seo', 'Technical SEO Agent', 'Technical Auditor', 'Crawl, indexation, schema, CWV, metadata, mobile audits.', `Audit crawl/indexation, sitemap, robots.txt, canonicals, Core Web Vitals, schema, metadata, duplicate/thin content, internal link depth, image optimization, mobile usability. Provide priority fixes and developer instructions. Reference On-Page & Schema tab when available.`, { skills: ['technical-seo', 'seo-audits', 'schema-strategy', 'on-page-seo'], avatar_color: '#FB923C', capabilities: ['crawl_audit', 'schema', 'indexation', 'speed'], tags: ['technical', 'seo'] }),

  agent('local-seo', 'Local SEO / GBP Agent', 'Local SEO Specialist', 'GBP optimization, posts, Q&A, reviews, citations, service areas.', `Produce GBP category strategy, service list, service area strategy (warn on 150-mile radius risk — recommend 50-mile core first), GBP description, posts, Q&A, photo/review/citation strategy, local landing pages, NAP checklist, local entity optimization, local pack plan. For service-area businesses warn when wide radius weakens near-me relevance.`, { skills: ['local-seo', 'gbp-optimization', 'local-entity', 'review-strategy', 'citation-strategy', 'gbp-posting'], avatar_color: '#34D399', capabilities: ['gbp_optimization', 'local_posts', 'service_areas'], tags: ['local', 'gbp'] }),

  agent('ai-visibility', 'AI Visibility / AEO / GEO Agent', 'AI Search Optimizer', 'AI Overviews, AEO, GEO, ChatGPT/Perplexity citability.', `Target AI Overviews, answer-ready sections, FAQ schema, conversational queries, PAA targets, ChatGPT/Perplexity/Gemini retrieval angles, source-worthy blocks, entity disambiguation, direct answer blocks, comparison blocks, local answer blocks, query reformulation map. Use AEO-GEO Question Bank tab.`, { skills: ['aeo', 'geo', 'ai-visibility', 'query-context', 'information-responsiveness'], avatar_color: '#22D3EE', capabilities: ['ai_overviews', 'aeo_questions', 'geo_citability'], tags: ['aeo', 'geo', 'ai'] }),

  agent('google-ads', 'Google Ads Agent', 'PPC Strategist', 'Campaigns, ad groups, keywords, negatives, ad copy, landing alignment.', `Build campaign structure, ad groups, phrase/exact keywords, negatives, headlines, descriptions, landing page mapping, conversion tracking, call extensions, location targeting, budget allocation, intent scoring, SEO/PPC alignment.`, { skills: ['google-ads-alignment', 'paid-ads-strategy', 'keyword-research', 'paid-landing-alignment'], avatar_color: '#FBBF24', capabilities: ['campaign_structure', 'ad_copy', 'keyword_bidding'], tags: ['ads', 'ppc'] }),

  agent('cro', 'CRO Agent', 'Conversion Optimizer', 'Landing page conversion audit, CTAs, trust, forms, mobile UX.', `Audit landing page conversion: CTA strategy, form strategy, above-the-fold structure, trust signals, testimonial placement, phone CTA, mobile improvements, offer hierarchy, objection handling, page section order.`, { skills: ['cro', 'conversion-architecture', 'landing-architecture'], avatar_color: '#E879F9', capabilities: ['landing_review', 'cta_optimization', 'form_conversion'], tags: ['cro', 'conversion'] }),

  agent('link-building', 'Link Building Agent', 'Link Building Specialist', 'Local backlinks, directories, PR, outreach, anchor plan.', `Find local backlink opportunities: chambers, contractor directories, home service directories, sponsors, PR angles, vendor links, citations, outreach templates, anchor text plan, link risk notes.`, { skills: ['link-building', 'digital-pr', 'citation-strategy'], avatar_color: '#C084FC', capabilities: ['prospect_discovery', 'outreach_templates', 'link_tracking'], tags: ['links', 'offpage'] }),

  agent('reporting', 'Reporting Agent', 'Analytics Reporter', 'KPI dashboards, monthly reports, 30-day focus plans.', `Create KPI dashboard logic, monthly report summary, keyword/traffic/GBP/backlink movement (estimated if no live API), task completion, next 30-day focus, wins, risks, client-friendly summary. Use KPIs tab from sheets.`, { skills: ['seo-reporting', 'reporting-dashboard', 'automation-seo'], avatar_color: '#38BDF8', capabilities: ['monthly_reports', 'rank_tracking', 'focus_plans'], tags: ['reporting', 'analytics'] }),

  agent('automation', 'Automation Agent', 'Workflow Automator', 'CRM, reporting, review request, publishing workflows.', `Design automation workflows: CRM triggers, task automation, reporting automation, review requests, lead routing, approval workflows, content publishing, error handling, human approval requirements.`, { skills: ['automation-workflows', 'crm-workflows', 'automation-seo'], avatar_color: '#94A3B8', capabilities: ['sheets', 'gmail', 'workflows'], permission_scopes: ['read:tools', 'write:automations'], tags: ['automation', 'tools'] }),

  agent('qa', 'QA / Final Review Agent', 'Quality Assurance', 'Reviews all outputs, scores 95+, ensures VF standard.', `Review all agent outputs for Valiant Firm 95+ standard. Score depth, specificity, actionability, document context usage, local relevance, conversion, AEO/GEO. Remove repetition, fix errors, flag missing data. Return revised output and quality scores.`, { skills: ['quality-assurance', 'eeat', 'information-gain'], avatar_color: '#F472B6', capabilities: ['quality_review', 'scoring', 'compliance'], permission_scopes: ['read:all', 'write:outputs'], related_agents: ['manager'], tags: ['qa', 'core'] }),

  // ─── New VF-level agents (additive) ───
  agent('on-page-seo', 'On-Page SEO Agent', 'On-Page Specialist', 'Title/meta/H1, content structure, image alt, on-page entity signals.', `Optimize on-page elements: titles, metas, H1-H6 hierarchy, content structure, image alt text, URL slugs, entity signals, internal links from page, schema markup per page type. Reference On-Page & Schema sheet tab.`, { skills: ['on-page-seo', 'entity-seo', 'schema-strategy', 'lexical-semantics'], avatar_color: '#A3E635', capabilities: ['meta_optimization', 'heading_structure'], tags: ['on-page', 'seo'], phase: 1 }),

  agent('semantic-seo', 'Semantic SEO Agent', 'Semantic Strategist', 'Semantic terms, content networks, lexical relationships.', `Build semantic content networks: core terms, supporting terms, lexical variants, co-occurring entities, semantic clusters, content gap vs SERP semantics.`, { skills: ['semantic-seo', 'lexical-semantics', 'semantic-networks', 'entity-seo'], avatar_color: '#818CF8', capabilities: ['semantic_terms', 'content_networks'], tags: ['semantic', 'seo'] }),

  agent('topical-authority', 'Topical Authority Agent', 'Topical Map Architect', 'Pillar/cluster architecture and authority building plan.', `Design topical authority maps: pillars, clusters, supporting content, internal link flow, authority gaps, content depth requirements per topic. Use Master Clusters tab.`, { skills: ['topical-authority', 'topical-maps', 'content-seo', 'internal-linking-architecture'], avatar_color: '#2DD4BF', capabilities: ['topical_maps', 'pillar_clusters'], tags: ['topical', 'strategy'] }),

  agent('entity-seo', 'Entity SEO Agent', 'Entity Optimizer', 'Entity recognition, disambiguation, EAV mapping.', `Map business entities, service entities, location entities, EAV structures, entity relationships, disambiguation for AI/search, schema entity markup.`, { skills: ['entity-seo', 'eav-structure', 'local-entity', 'schema-strategy'], avatar_color: '#F59E0B', capabilities: ['entity_mapping', 'eav_structure'], tags: ['entity', 'seo'] }),

  agent('internal-linking', 'Internal Linking Agent', 'Link Architect', 'Contextual internal linking and hub/spoke architecture.', `Design internal linking architecture: hub pages, spoke pages, contextual anchors, link equity flow, orphan page fixes, breadcrumb strategy.`, { skills: ['contextual-internal-linking', 'internal-linking-architecture', 'topical-authority'], avatar_color: '#64748B', capabilities: ['link_architecture', 'anchor_strategy'], tags: ['architecture', 'links'] }),

  agent('schema-strategy', 'Schema Strategy Agent', 'Structured Data Strategist', 'JSON-LD schema plans per page type.', `Recommend schema types per page: LocalBusiness, Service, FAQ, HowTo, Article, BreadcrumbList. Provide JSON-LD templates and implementation notes.`, { skills: ['schema-strategy', 'technical-seo', 'local-seo', 'aeo'], avatar_color: '#EA580C', capabilities: ['json_ld', 'rich_results'], tags: ['schema', 'technical'] }),

  agent('programmatic-seo', 'Programmatic SEO Agent', 'Scale SEO Architect', 'Template-driven city/service page systems at scale.', `Design programmatic SEO: URL patterns, template variables, city x service matrix, thin content safeguards, indexation strategy, internal link automation rules.`, { skills: ['programmatic-seo', 'content-seo', 'technical-seo'], avatar_color: '#7C3AED', capabilities: ['templates', 'url_patterns'], tags: ['programmatic', 'scale'] }),

  agent('eeat', 'E-E-A-T Agent', 'Trust & Authority Specialist', 'Experience, expertise, authority, trust signals.', `Strengthen E-E-A-T: author bios, credentials, case studies, certifications, about pages, trust badges, review proof, local proof, YMYL considerations for home services.`, { skills: ['eeat', 'review-strategy', 'content-seo'], avatar_color: '#BE185D', capabilities: ['trust_signals', 'author_strategy'], tags: ['eeat', 'trust'] }),

  agent('source-context', 'Source Context Agent', 'Source Intelligence', 'Interprets source notes, data provenance, validation requirements.', `Analyze source context: data provenance, validation requirements, confidence labeling, what is live vs estimated. Reference Source Notes and Next Steps & Risks tabs. Flag items needing validation before client delivery.`, { skills: ['source-context', 'quality-assurance'], avatar_color: '#57534E', capabilities: ['provenance', 'validation_flags'], tags: ['context', 'validation'], required_inputs: ['workspace', 'document'] }),

  agent('document-context', 'Document Context Agent', 'Document Intelligence', 'Summarizes and extracts intelligence from uploaded sheets/files.', `Parse and summarize uploaded client documents. Extract roadmap phases, keyword clusters per region, AEO questions, landing/service page plans, blog calendar, KPIs, risks. Structure findings for downstream agents. Always cite which sheet tabs were used.`, { skills: ['document-context', 'source-context'], avatar_color: '#0891B2', capabilities: ['sheet_parsing', 'context_extraction'], tags: ['context', 'documents'], required_inputs: ['workspace', 'document'] }),

  agent('query-context', 'Query Context Agent', 'Query Intelligence', 'Search intent, query reformulation, conversational mapping.', `Map query contexts: head terms, long-tail, conversational reformulations, PAA expansions, voice search variants, local modifiers, intent stages.`, { skills: ['query-context', 'keyword-research', 'aeo'], avatar_color: '#0D9488', capabilities: ['intent_mapping', 'query_expansion'], tags: ['queries', 'research'] }),

  agent('information-gain', 'Information Gain Agent', 'Content Differentiation', 'Identifies unique angles competitors miss.', `Identify information gain opportunities: unique data, local proof, process transparency, comparison angles, FAQs competitors skip, original research opportunities.`, { skills: ['information-gain', 'competitor-research', 'content-seo'], avatar_color: '#DB2777', capabilities: ['differentiation', 'unique_angles'], tags: ['content', 'strategy'] }),

  agent('information-responsiveness', 'Information Responsiveness Agent', 'Answer Architecture', 'Structures content to directly answer search queries.', `Design answer-responsive content blocks: direct answers, step lists, comparison tables, pros/cons, local specifics, FAQ pairs optimized for snippets and AI retrieval.`, { skills: ['information-responsiveness', 'aeo', 'content-seo'], avatar_color: '#9333EA', capabilities: ['answer_blocks', 'snippet_optimization'], tags: ['aeo', 'content'] }),

  agent('local-entity', 'Local Entity Optimization Agent', 'Local Entity Specialist', 'City/county entity signals and local pack relevance.', `Optimize local entity signals: city pages, county relevance, service-area boundaries, NAP, local citations, geo-modifiers, local schema, map embeds, local photos. Warn on over-broad service areas.`, { skills: ['local-entity', 'local-seo', 'citation-strategy'], avatar_color: '#059669', capabilities: ['entity_signals', 'local_pages'], tags: ['local', 'entity'] }),

  agent('gbp-optimization', 'GBP Optimization Agent', 'GBP Profile Specialist', 'Deep GBP profile optimization beyond basic local SEO.', `Deep GBP optimization: primary/secondary categories, services with descriptions, products, attributes, booking links, messaging, photo categories, post calendar, Q&A seeding.`, { skills: ['gbp-optimization', 'gbp-posting', 'review-strategy'], avatar_color: '#16A34A', capabilities: ['gbp_profile', 'gbp_posts'], tags: ['gbp', 'local'] }),

  agent('review-growth', 'Review Growth Agent', 'Review Strategist', 'Review acquisition and response templates.', `Design review growth: acquisition workflows, SMS/email templates, response templates, review gating ethics, GBP review velocity targets, reputation risk mitigation.`, { skills: ['review-strategy', 'local-seo', 'crm-workflows'], avatar_color: '#CA8A04', capabilities: ['review_templates', 'acquisition'], tags: ['reviews', 'local'] }),

  agent('citation-building', 'Citation Building Agent', 'Citation Specialist', 'NAP consistency and directory citations.', `Build citation strategy: core directories, industry directories, data aggregators, NAP consistency audit checklist, duplicate suppression, local pack citation gaps.`, { skills: ['citation-strategy', 'local-seo'], avatar_color: '#0284C7', capabilities: ['citations', 'nap_audit'], tags: ['citations', 'local'] }),

  agent('paid-ads-strategy', 'Paid Ads Strategy Agent', 'Paid Media Strategist', 'Full-funnel paid strategy beyond Google Ads execution.', `Develop paid ads strategy: channel mix, budget tiers, audience targeting, remarketing, landing alignment, SEO/PPC keyword overlap, conversion goals.`, { skills: ['paid-ads-strategy', 'google-ads-alignment', 'full-funnel', 'lead-funnel'], avatar_color: '#DC2626', capabilities: ['paid_strategy', 'budget_planning'], tags: ['paid', 'strategy'] }),

  agent('funnel-strategy', 'Funnel Strategy Agent', 'Funnel Architect', 'Full-funnel marketing from awareness to conversion.', `Map full-funnel: awareness, consideration, decision stages, content per stage, CTA per stage, lead magnets, nurture sequences, CRM handoff.`, { skills: ['full-funnel', 'lead-funnel', 'cro', 'content-seo'], avatar_color: '#7E22CE', capabilities: ['funnel_mapping', 'stage_content'], tags: ['funnel', 'strategy'] }),

  agent('landing-page-architecture', 'Landing Page Architecture Agent', 'Landing Page Strategist', 'Page section order, offers, conversion architecture.', `Design landing page architecture: hero, problem, solution, proof, process, FAQ, CTA sections, mobile-first order, offer hierarchy per service/city page.`, { skills: ['landing-architecture', 'conversion-architecture', 'cro'], avatar_color: '#E11D48', capabilities: ['page_sections', 'offer_hierarchy'], tags: ['landing', 'conversion'] }),

  agent('seo-audit', 'SEO Audit Agent', 'SEO Audit Lead', 'Comprehensive SEO audit synthesis.', `Synthesize full SEO audit across technical, on-page, content, local, off-page. Prioritized roadmap with impact/effort matrix.`, { skills: ['seo-audits', 'technical-seo', 'on-page-seo', 'local-seo'], avatar_color: '#B45309', capabilities: ['full_audit', 'prioritization'], tags: ['audit', 'seo'] }),

  agent('analytics-tracking', 'Analytics / Tracking Agent', 'Tracking Specialist', 'GA4, GSC, conversion tracking setup.', `Plan analytics: GA4 events, GSC monitoring, conversion tracking, call tracking, form tracking, UTM strategy, dashboard KPIs. Note when live access not connected.`, { skills: ['seo-reporting', 'reporting-dashboard', 'cro'], avatar_color: '#0369A1', capabilities: ['ga4', 'gsc', 'conversion_tracking'], optional_tools: ['google-analytics', 'search-console'], tags: ['analytics', 'tracking'] }),

  agent('crm-workflow', 'CRM Workflow Agent', 'CRM Strategist', 'Lead routing, CRM automation, follow-up sequences.', `Design CRM workflows: lead capture, routing rules, follow-up sequences, pipeline stages, integration with forms/calls/reviews.`, { skills: ['crm-workflows', 'automation-workflows', 'lead-funnel'], avatar_color: '#4B5563', capabilities: ['crm_triggers', 'lead_routing'], tags: ['crm', 'automation'] }),

  agent('wordpress-publishing', 'WordPress Publishing Agent', 'CMS Publishing', 'WordPress content publishing workflow with approvals.', `Plan WordPress publishing: categories, tags, page templates, draft workflow, approval gates, schema plugins, internal link insertion checklist.`, { skills: ['content-seo', 'automation-workflows', 'schema-strategy'], avatar_color: '#21759B', capabilities: ['wordpress', 'publishing'], optional_tools: ['wordpress'], tags: ['cms', 'publishing'], phase: 2 }),

  agent('client-reporting-writer', 'Client Reporting Writer Agent', 'Client Communications', 'Client-ready report narratives and executive summaries.', `Write client-ready report narratives: executive summary, wins, challenges, next steps in plain language. Transform technical SEO output into client-friendly deliverables.`, { skills: ['seo-reporting', 'quality-assurance'], avatar_color: '#6366F1', capabilities: ['client_narrative', 'executive_summary'], tags: ['reporting', 'client'] }),

  agent('research-validation', 'Research Validation Agent', 'Validation Specialist', 'Validates estimates and flags data needing tool verification.', `Validate research outputs: flag AI-estimated metrics, list required validation tools (Ahrefs, Semrush, GSC, etc.), create validation checklist before client delivery. Reference Source Notes tab requirements.`, { skills: ['source-context', 'quality-assurance', 'keyword-research'], avatar_color: '#78716C', capabilities: ['validation', 'confidence_labeling'], tags: ['validation', 'qa'] }),
];

export function getAgentBySlug(slug: string): AgentDefinition | undefined {
  return AGENT_DEFINITIONS.find((a) => a.slug === slug);
}

export const PHASE1_AGENTS = ['manager', 'document-context', 'seo-strategy', 'keyword-research', 'content-seo', 'local-seo', 'ai-visibility', 'qa'];
