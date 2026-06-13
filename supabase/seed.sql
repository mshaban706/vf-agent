-- VF Agent Command Center — Seed Data

-- ─── Agent Catalog ──────────────────────────────────────────
INSERT INTO public.agents (slug, name, role, description, avatar_color, capabilities, permission_scopes) VALUES
  ('manager', 'Manager Agent', 'Orchestrator', 'Analyzes commands, creates task plans, assigns work, tracks progress, and delivers final output.', '#D4AF37', '["planning","delegation","review","synthesis"]', '["read:all","write:tasks","assign:agents"]'),
  ('seo-strategy', 'SEO Strategy Agent', 'SEO Strategist', 'Creates SEO strategies, topical maps, page gap analysis, internal linking, semantic/entity/AEO/GEO optimization.', '#4ADE80', '["topical_maps","gap_analysis","internal_linking","aeo_geo","entity_seo"]', '["read:web","write:outputs"]'),
  ('keyword-research', 'Keyword Research Agent', 'Keyword Analyst', 'Finds service, local, near-me, AEO/GEO, buyer intent, and commercial intent keywords with location tabs.', '#60A5FA', '["service_keywords","local_keywords","intent_clustering","location_tabs","aeo_questions"]', '["read:web","write:outputs"]'),
  ('competitor-research', 'Competitor Research Agent', 'Competitive Analyst', 'Finds competitors, analyzes weak points, ranking pages, content depth, and gap reports.', '#F87171', '["competitor_discovery","ranking_analysis","content_depth","gap_reports"]', '["read:web","write:outputs"]'),
  ('content-seo', 'Content SEO Agent', 'Content Strategist', 'Writes service pages, city pages, blog outlines, FAQs with EEAT, semantic entities, and conversion CTAs.', '#A78BFA', '["service_pages","city_pages","blog_outlines","faqs","eeat","ctas"]', '["read:web","write:outputs","write:drafts"]'),
  ('technical-seo', 'Technical SEO Agent', 'Technical Auditor', 'Audits sitemap, robots.txt, schema, indexation, redirects, speed, meta tags, and crawl structure.', '#FB923C', '["crawl_audit","schema","indexation","speed","meta_audit"]', '["read:web","write:outputs"]'),
  ('local-seo', 'Local SEO / GBP Agent', 'Local SEO Specialist', 'GBP optimization, posts, Q&A, review templates, location entity optimization, service area structure.', '#34D399', '["gbp_optimization","local_posts","review_templates","service_areas"]', '["read:web","write:outputs","write:drafts"]'),
  ('google-ads', 'Google Ads Agent', 'PPC Strategist', 'Builds campaigns, ad groups, keywords, negatives, headlines, descriptions, landing page alignment.', '#FBBF24', '["campaign_structure","ad_copy","keyword_bidding","landing_alignment"]', '["read:web","write:outputs","write:drafts"]'),
  ('cro', 'CRO Agent', 'Conversion Optimizer', 'Reviews landing pages, improves CTAs, trust blocks, form conversion, and page layout.', '#E879F9', '["landing_review","cta_optimization","trust_blocks","form_conversion"]', '["read:web","write:outputs"]'),
  ('reporting', 'Reporting Agent', 'Analytics Reporter', 'Creates monthly SEO reports with MoM growth, rankings, backlinks, traffic, and 30-day focus plans.', '#38BDF8', '["monthly_reports","rank_tracking","traffic_analysis","focus_plans"]', '["read:analytics","write:outputs","write:reports"]'),
  ('automation', 'Automation Agent', 'Workflow Automator', 'Connects Google Sheets, Gmail, Calendar, WordPress, Supabase, WhatsApp, CRM workflows.', '#94A3B8', '["sheets","gmail","calendar","wordpress","crm","workflows"]', '["read:tools","write:automations","execute:tools"]'),
  ('qa', 'QA Agent', 'Quality Assurance', 'Reviews all outputs, removes repetition, checks quality, scores 0-100, ensures 95+ Valiant Firm standard.', '#F472B6', '["quality_review","scoring","deduplication","compliance"]', '["read:all","write:outputs"]')
ON CONFLICT (slug) DO NOTHING;

-- ─── Tools Catalog ──────────────────────────────────────────
INSERT INTO public.tools (slug, name, description, category, requires_approval, config_schema) VALUES
  ('google-sheets', 'Google Sheets', 'Read and write Google Sheets data', 'productivity', false, '{"fields":["client_id","client_secret","spreadsheet_id"]}'),
  ('gmail', 'Gmail', 'Send and read emails via Gmail API', 'communication', true, '{"fields":["client_id","client_secret","refresh_token"]}'),
  ('google-calendar', 'Google Calendar', 'Manage calendar events', 'productivity', false, '{"fields":["client_id","client_secret","calendar_id"]}'),
  ('wordpress', 'WordPress', 'Publish and manage WordPress content', 'cms', true, '{"fields":["site_url","username","app_password"]}'),
  ('supabase', 'Supabase', 'Query and manage Supabase databases', 'database', false, '{"fields":["url","service_role_key"]}'),
  ('whatsapp', 'WhatsApp Gateway', 'Send WhatsApp messages', 'communication', true, '{"fields":["api_key","phone_number_id"]}'),
  ('playwright', 'Browser Automation', 'Automate browser tasks with Playwright', 'automation', true, '{"fields":["headless","timeout_ms"]}'),
  ('web-search', 'Web Search', 'Search the web for research', 'research', false, '{}'),
  ('serp-api', 'SERP API', 'Fetch search engine results', 'research', false, '{"fields":["api_key"]}')
ON CONFLICT (slug) DO NOTHING;
