import type { ConfidenceLabel } from './vf-framework';

export interface QualityScores {
  depth_score: number;
  specificity_score: number;
  actionability_score: number;
  source_context_score: number;
  document_context_score: number;
  local_relevance_score: number;
  conversion_score: number;
  ai_visibility_score: number;
  technical_accuracy_score: number;
  vf_standard_score: number;
}

export interface QualityGateResult {
  scores: QualityScores;
  passes: boolean;
  warnings: string[];
  missing_sections: string[];
}

const REQUIRED_MARKERS = [
  'executive summary',
  'client context',
  'key findings',
  'next action',
  'missing data',
  'risk',
];

const CONTEXT_MARKERS = ['document', 'sheet', 'uploaded', 'context used', 'polar', 'roadmap', 'cluster'];

export function scoreAgentOutput(
  output: string,
  options: {
    usedDocumentContext?: boolean;
    hasLocationContext?: boolean;
    isSeoContentTask?: boolean;
    isLocalSeoTask?: boolean;
  } = {},
): QualityGateResult {
  const text = output.toLowerCase();
  const len = output.length;
  const warnings: string[] = [];
  const missing_sections: string[] = [];

  for (const marker of REQUIRED_MARKERS) {
    if (!text.includes(marker)) missing_sections.push(marker);
  }

  const depth_score = Math.min(100, Math.round((len / 4000) * 100));
  const specificity_score = Math.min(
    100,
    (text.match(/\b(wewahitchka|gulf county|panama city|tallahassee|dothan|albany|spray foam|insulation)\b/gi)?.length ?? 0) * 8 +
      (text.match(/\d+/g)?.length ?? 0) * 2 +
      20,
  );
  const actionability_score = Math.min(
    100,
    (text.match(/\b(implement|create|build|optimize|launch|fix|add|update|schedule|assign|priority)\b/gi)?.length ?? 0) * 6 + 25,
  );
  const source_context_score = text.includes('confidence') || text.includes('estimated') || text.includes('validation') ? 85 : 55;
  const document_context_score = options.usedDocumentContext
    ? CONTEXT_MARKERS.some((m) => text.includes(m))
      ? 95
      : 45
    : 70;
  const local_relevance_score = options.hasLocationContext
    ? Math.min(100, (text.match(/\b(city|local|gbp|service area|near me|county|region)\b/gi)?.length ?? 0) * 5 + 30)
    : 75;
  const conversion_score = Math.min(
    100,
    (text.match(/\b(cta|conversion|form|trust|testimonial|call|lead)\b/gi)?.length ?? 0) * 8 + 20,
  );
  const ai_visibility_score = Math.min(
    100,
    (text.match(/\b(aeo|geo|ai overview|perplexity|chatgpt|snippet|faq schema)\b/gi)?.length ?? 0) * 10 + 15,
  );
  const technical_accuracy_score = Math.min(
    100,
    (text.match(/\b(schema|canonical|sitemap|robots|core web vitals|indexation)\b/gi)?.length ?? 0) * 8 + 25,
  );

  if (missing_sections.length) {
    warnings.push(`Missing sections: ${missing_sections.join(', ')}`);
  }
  if (options.usedDocumentContext && document_context_score < 70) {
    warnings.push('Uploaded document context was provided but output may not reference it sufficiently.');
  }

  const vf_standard_score = Math.round(
    depth_score * 0.15 +
      specificity_score * 0.12 +
      actionability_score * 0.15 +
      source_context_score * 0.08 +
      document_context_score * 0.12 +
      local_relevance_score * 0.1 +
      conversion_score * 0.08 +
      ai_visibility_score * 0.1 +
      technical_accuracy_score * 0.1,
  );

  return {
    scores: {
      depth_score,
      specificity_score,
      actionability_score,
      source_context_score,
      document_context_score,
      local_relevance_score,
      conversion_score,
      ai_visibility_score,
      technical_accuracy_score,
      vf_standard_score,
    },
    passes: vf_standard_score >= 95,
    warnings,
    missing_sections,
  };
}

export const QUALITY_IMPROVEMENT_PROMPT = `Improve this output to Valiant Firm 95+ level. Add missing depth, specific actions, uploaded document/sheet context references, internal links, schema, AEO/GEO, local SEO risks (especially 150-mile service area warnings), conversion CTAs, confidence labels (Live Verified / Tool Estimated / AI Estimated / Needs Validation), and implementation steps. Do not remove existing good content. Return the full improved output.`;

export function formatQualitySummary(scores: QualityScores, passes: boolean): string {
  const status = passes ? '✓ VF 95+ Standard Met' : '⚠ Output needs strategist review';
  return `${status}\n\nQuality Scores:\n- VF Standard: ${scores.vf_standard_score}/100\n- Depth: ${scores.depth_score}\n- Specificity: ${scores.specificity_score}\n- Actionability: ${scores.actionability_score}\n- Document Context: ${scores.document_context_score}\n- Local Relevance: ${scores.local_relevance_score}\n- AI Visibility: ${scores.ai_visibility_score}`;
}
