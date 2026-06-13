import type { ResearchBrief } from './researching-mode';
import { VF_WORKBOOK_TABS, STANDARD_KPIS } from './workbook-spec';

export interface WorkbookQAScore {
  executiveDashboard: number;
  keywordResearch: number;
  marketLocalSeo: number;
  competitorResearch: number;
  contentArchitecture: number;
  aeoGeo: number;
  technicalSeo: number;
  internalLinking: number;
  schema: number;
  croPaidAds: number;
  roadmapExecution: number;
  sourceValidation: number;
  finalScore: number;
  weakAreas: string[];
  passed: boolean;
}

export type WorkbookSheetData = Record<string, Array<Record<string, string | number>>>;

const WEIGHTS = {
  executiveDashboard: 10,
  keywordResearch: 15,
  marketLocalSeo: 10,
  competitorResearch: 10,
  contentArchitecture: 10,
  aeoGeo: 10,
  technicalSeo: 8,
  internalLinking: 7,
  schema: 5,
  croPaidAds: 5,
  roadmapExecution: 5,
  sourceValidation: 5,
};

function rowCount(sheets: WorkbookSheetData, name: string): number {
  return sheets[name]?.length ?? 0;
}

function scoreByRows(actual: number, required: number, maxPoints: number): number {
  if (required <= 0) return maxPoints;
  const ratio = Math.min(1, actual / required);
  return Math.round(ratio * maxPoints * 10) / 10;
}

export function scoreWorkbook(sheets: WorkbookSheetData, locationTabCount = 0): WorkbookQAScore {
  const scores = {
    executiveDashboard: scoreByRows(rowCount(sheets, 'Executive Dashboard'), 20, WEIGHTS.executiveDashboard),
    keywordResearch: scoreByRows(
      rowCount(sheets, 'Master Keywords') + rowCount(sheets, 'Near Me Keywords'),
      40,
      WEIGHTS.keywordResearch,
    ),
    marketLocalSeo: scoreByRows(
      rowCount(sheets, 'Market Grouping') + rowCount(sheets, 'GBP Optimization') + locationTabCount * 5,
      15,
      WEIGHTS.marketLocalSeo,
    ),
    competitorResearch: scoreByRows(
      rowCount(sheets, 'Competitor Matrix') + rowCount(sheets, 'Competitor Weak Points'),
      12,
      WEIGHTS.competitorResearch,
    ),
    contentArchitecture: scoreByRows(
      rowCount(sheets, 'Website Architecture') +
        rowCount(sheets, 'Service Pages') +
        rowCount(sheets, 'Blog Calendar'),
      25,
      WEIGHTS.contentArchitecture,
    ),
    aeoGeo: scoreByRows(rowCount(sheets, 'AEO GEO AI Visibility'), 12, WEIGHTS.aeoGeo),
    technicalSeo: scoreByRows(
      rowCount(sheets, 'Website Audit') + rowCount(sheets, 'Technical SEO Checklist'),
      12,
      WEIGHTS.technicalSeo,
    ),
    internalLinking: scoreByRows(rowCount(sheets, 'Internal Linking Map'), 12, WEIGHTS.internalLinking),
    schema: scoreByRows(rowCount(sheets, 'Schema Strategy'), 8, WEIGHTS.schema),
    croPaidAds: scoreByRows(
      rowCount(sheets, 'CRO Strategy') + rowCount(sheets, 'Google Ads Alignment'),
      8,
      WEIGHTS.croPaidAds,
    ),
    roadmapExecution: scoreByRows(
      rowCount(sheets, '30-60-90 Roadmap') + rowCount(sheets, 'Implementation Tracker'),
      20,
      WEIGHTS.roadmapExecution,
    ),
    sourceValidation: scoreByRows(
      rowCount(sheets, 'Source Evidence') + rowCount(sheets, 'Validation Notes'),
      10,
      WEIGHTS.sourceValidation,
    ),
  };

  const finalScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0));

  const weakAreas: string[] = [];
  if (scores.executiveDashboard < WEIGHTS.executiveDashboard * 0.8) weakAreas.push('Executive Dashboard');
  if (scores.keywordResearch < WEIGHTS.keywordResearch * 0.8) weakAreas.push('Keyword Research');
  if (scores.marketLocalSeo < WEIGHTS.marketLocalSeo * 0.8) weakAreas.push('Market/Local SEO');
  if (scores.competitorResearch < WEIGHTS.competitorResearch * 0.8) weakAreas.push('Competitor Research');
  if (scores.contentArchitecture < WEIGHTS.contentArchitecture * 0.8) weakAreas.push('Content Architecture');
  if (scores.aeoGeo < WEIGHTS.aeoGeo * 0.8) weakAreas.push('AEO/GEO');
  if (scores.sourceValidation < WEIGHTS.sourceValidation * 0.8) weakAreas.push('Source Validation');

  return { ...scores, finalScore, weakAreas, passed: finalScore >= 95 };
}

export function buildFinalQAScoreRows(qa: WorkbookQAScore): Array<Record<string, string | number>> {
  return [
    { Category: 'Executive Dashboard', 'Max Points': 10, Score: qa.executiveDashboard, 'Improvement Needed': qa.executiveDashboard < 8 ? 'Yes' : 'No' },
    { Category: 'Keyword Research', 'Max Points': 15, Score: qa.keywordResearch, 'Improvement Needed': qa.keywordResearch < 12 ? 'Yes' : 'No' },
    { Category: 'Market/Local SEO', 'Max Points': 10, Score: qa.marketLocalSeo, 'Improvement Needed': qa.marketLocalSeo < 8 ? 'Yes' : 'No' },
    { Category: 'Competitor Research', 'Max Points': 10, Score: qa.competitorResearch, 'Improvement Needed': qa.competitorResearch < 8 ? 'Yes' : 'No' },
    { Category: 'Content Architecture', 'Max Points': 10, Score: qa.contentArchitecture, 'Improvement Needed': qa.contentArchitecture < 8 ? 'Yes' : 'No' },
    { Category: 'AEO/GEO/AI Visibility', 'Max Points': 10, Score: qa.aeoGeo, 'Improvement Needed': qa.aeoGeo < 8 ? 'Yes' : 'No' },
    { Category: 'Technical SEO', 'Max Points': 8, Score: qa.technicalSeo, 'Improvement Needed': qa.technicalSeo < 6 ? 'Yes' : 'No' },
    { Category: 'Internal Linking', 'Max Points': 7, Score: qa.internalLinking, 'Improvement Needed': qa.internalLinking < 5 ? 'Yes' : 'No' },
    { Category: 'Schema', 'Max Points': 5, Score: qa.schema, 'Improvement Needed': qa.schema < 4 ? 'Yes' : 'No' },
    { Category: 'CRO/Paid Ads Alignment', 'Max Points': 5, Score: qa.croPaidAds, 'Improvement Needed': qa.croPaidAds < 4 ? 'Yes' : 'No' },
    { Category: 'Roadmap/Execution', 'Max Points': 5, Score: qa.roadmapExecution, 'Improvement Needed': qa.roadmapExecution < 4 ? 'Yes' : 'No' },
    { Category: 'Source Validation', 'Max Points': 5, Score: qa.sourceValidation, 'Improvement Needed': qa.sourceValidation < 4 ? 'Yes' : 'No' },
    { Category: 'FINAL SCORE', 'Max Points': 100, Score: qa.finalScore, Notes: qa.passed ? 'VF 95+ PASSED' : 'Needs strategist review', 'Improvement Needed': qa.passed ? 'No' : 'Yes' },
  ];
}

export function seedWorkbookFromBrief(brief: ResearchBrief): WorkbookSheetData {
  const sheets: WorkbookSheetData = {};

  sheets['Executive Dashboard'] = [
    { Section: 'Client', Metric: 'Client Name', Value: brief.clientName, Notes: '' },
    { Section: 'Client', Metric: 'Website', Value: brief.website, Notes: '' },
    { Section: 'Client', Metric: 'Industry', Value: brief.industry, Notes: '' },
    { Section: 'Client', Metric: 'Main Location', Value: brief.mainLocation, Notes: '' },
    { Section: 'Client', Metric: 'Service Area', Value: brief.radius, Notes: 'Validate broad radius for local SEO' },
    { Section: 'Client', Metric: 'Research Date', Value: brief.researchDate, Notes: '' },
    { Section: 'Client', Metric: 'Primary Goal', Value: brief.goal, Notes: '' },
    { Section: 'Scores', Metric: 'Overall Opportunity Score', Value: 'TBD', Notes: 'AI Estimated — validate with GSC/Ahrefs' },
    { Section: 'Scores', Metric: 'SEO Difficulty Score', Value: 'TBD', Notes: 'AI Estimated' },
    { Section: 'Scores', Metric: 'Local SEO Priority', Value: 'High', Notes: 'Service-area business' },
    { Section: 'Scores', Metric: 'Content Gap Score', Value: 'TBD', Notes: '' },
    { Section: 'Scores', Metric: 'Technical Risk Score', Value: 'TBD', Notes: '' },
    { Section: 'Scores', Metric: 'Competitor Threat Score', Value: 'TBD', Notes: '' },
    { Section: 'Scores', Metric: 'AEO/GEO Opportunity Score', Value: 'High', Notes: '' },
    { Section: 'Totals', Metric: 'Total Keywords', Value: '=COUNTA(\'Master Keywords\'!A:A)-1', Notes: 'Formula' },
    { Section: 'Totals', Metric: 'Total Near Me Keywords', Value: '=COUNTA(\'Near Me Keywords\'!A:A)-1', Notes: 'Formula' },
    { Section: 'Totals', Metric: 'Total Competitors Analyzed', Value: '=COUNTA(\'Competitor Matrix\'!A:A)-1', Notes: 'Formula' },
    { Section: 'Totals', Metric: 'Total Internal Links Planned', Value: '=COUNTA(\'Internal Linking Map\'!A:A)-1', Notes: 'Formula' },
    { Section: 'Totals', Metric: 'Estimated Cost Total', Value: '=SUM(\'Cost Dashboard\'!E:E)', Notes: 'Formula' },
    { Section: 'Focus', Metric: '30-Day Focus', Value: 'Core market domination + technical fixes + GBP optimization', Notes: '' },
    { Section: 'Focus', Metric: '60-Day Focus', Value: 'Content expansion + city pages + internal linking', Notes: '' },
    { Section: 'Focus', Metric: '90-Day Focus', Value: 'Link building + AEO/GEO + paid alignment', Notes: '' },
  ];

  sheets['Validation Notes'] = brief.missingFields.map((field, i) => ({
    Assumption: field,
    'Why It Was Used': 'Missing from input — inferred from context',
    'Risk Level': 'Medium',
    'Validation Needed': 'Yes',
    'Recommended Tool': 'Client intake / GSC / GBP',
    Priority: i + 1,
  }));

  sheets['Source Evidence'] = [
    {
      'Evidence ID': 'EV-001',
      'Data Point': 'Research brief and client context',
      'Source Type': 'Internal',
      'Source Name': 'VF Command Center',
      'Source URL': brief.website,
      'Tool Used': 'VF Intelligence Engine',
      'Date Checked': brief.researchDate,
      'Confidence Level': 'Medium',
      'Validation Status': 'AI Estimated',
      Notes: 'Baseline research context',
    },
  ];

  sheets['Market Grouping'] = brief.targetLocations.slice(0, 8).map((loc, i) => ({
    'Market Code': `MKT-${String(i + 1).padStart(2, '0')}`,
    'Market Name': loc,
    'Core City': loc.split(',')[0]?.trim() || loc,
    'Supporting Cities': brief.targetLocations.filter((t) => t !== loc).slice(0, 3).join('; ') || 'TBD',
    'County/Region': 'Needs Validation',
    State: 'Needs Validation',
    'Distance from Main Location': brief.radius.includes('150') ? 'Extended — hub/spoke recommended' : 'Core',
    'Local SEO Difficulty': 'Medium-High',
    'Opportunity Score': 8 - i * 0.5,
    'Priority Tier': i === 0 ? 'Tier 1' : i < 3 ? 'Tier 2' : 'Tier 3',
    'Recommended Strategy': i === 0 ? 'Dominate core market first' : 'Dedicated city/service pages + local proof',
    'Required Pages': 'Service + City + GBP support',
    'GBP Relevance Notes': 'Service-area — strengthen with city pages',
    'Risk Notes': brief.radius.includes('150') ? '150-mile radius weakens near-me relevance' : '',
  }));

  sheets['KPI Dashboard'] = STANDARD_KPIS.map((kpi) => ({
    KPI: kpi,
    Baseline: 'TBD',
    'Target Month 1': 'TBD',
    'Target Month 2': 'TBD',
    'Target Month 3': 'TBD',
    Current: 'TBD',
    Change: 'TBD',
    Status: 'Needs Validation',
    Notes: 'Connect GA4/GSC/GBP for live data',
  }));

  for (const tab of VF_WORKBOOK_TABS) {
    if (!sheets[tab.name]) sheets[tab.name] = [];
  }

  return sheets;
}

export const WORKBOOK_IMPROVEMENT_PROMPT = `Improve this VF SEO Master workbook data to score 95+ on Valiant Firm standards.
Add missing depth to weak tabs. Every row must be client-specific, actionable, and include validation status.
Never fabricate live Ahrefs/Semrush/GSC metrics. Return JSON: { "sheets": { "Tab Name": [rows] } }`;
