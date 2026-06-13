import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  parseResearchBrief,
  getWorkbookFileName,
  scoreWorkbook,
  seedWorkbookFromBrief,
  buildFinalQAScoreRows,
  WORKBOOK_IMPROVEMENT_PROMPT,
  LOCATION_TAB_COLUMNS,
  locationTabName,
  type ResearchBrief,
  type WorkbookSheetData,
  type WorkbookQAScore,
} from '@vf/shared';
import { AiProviderService } from '../orchestrator/ai-provider.service';
import { LiveLogsService } from '../live-logs/live-logs.service';
import { SupabaseService } from '../supabase/supabase.service';
import { WorkbookBuilderService } from './workbook-builder.service';

export interface ResearchWorkbookResult {
  fileId: string;
  fileName: string;
  downloadPath: string;
  qaScore: WorkbookQAScore;
  tabNames: string[];
  summaryMarkdown: string;
}

@Injectable()
export class ResearchWorkbookService {
  private readonly logger = new Logger(ResearchWorkbookService.name);
  private readonly uploadRoot = resolve(process.cwd(), '..', '..', 'uploads');

  constructor(
    private builder: WorkbookBuilderService,
    private ai: AiProviderService,
    private liveLogs: LiveLogsService,
    private supabase: SupabaseService,
  ) {}

  compileFromAgentOutputs(
    agentOutputs: Map<string, string>,
    brief: ResearchBrief,
  ): { sheets: WorkbookSheetData; locationTabs: Record<string, Array<Record<string, string | number>>> } {
    let sheets = seedWorkbookFromBrief(brief);
    const locationTabs: Record<string, Array<Record<string, string | number>>> = {};

    for (const [, output] of agentOutputs) {
      const parsed = this.extractJsonFromOutput(output);
      if (!parsed?.sheets) continue;

      for (const [tabName, rows] of Object.entries(parsed.sheets as Record<string, unknown>)) {
        if (!Array.isArray(rows)) continue;
        const normalized = tabName.trim();
        if (normalized.startsWith('Loc -') || normalized.startsWith('Location -')) {
          const market = normalized.replace(/^Loc(?:ation)?\s*-\s*/i, '');
          locationTabs[market] = this.mergeRows(locationTabs[market], rows as Array<Record<string, string | number>>);
        } else {
          sheets[normalized] = this.mergeRows(sheets[normalized], rows as Array<Record<string, string | number>>);
        }
      }
    }

    sheets = this.ensureMinimumDepth(sheets, brief, locationTabs);
    return { sheets, locationTabs };
  }

  async improveWorkbook(
    sheets: WorkbookSheetData,
    qa: WorkbookQAScore,
    brief: ResearchBrief,
    workspaceId: string,
  ): Promise<WorkbookSheetData> {
    await this.liveLogs.add(
      workspaceId,
      'info',
      `Workbook QA ${qa.finalScore}/100 — improvement pass for: ${qa.weakAreas.join(', ')}`,
      { weak_areas: qa.weakAreas },
    );

    const weakData: WorkbookSheetData = {};
    for (const area of qa.weakAreas) {
      const key = this.mapWeakAreaToSheet(area);
      if (key && sheets[key]) weakData[key] = sheets[key];
    }

    const response = await this.ai.chat(
      [
        {
          role: 'system',
          content: WORKBOOK_IMPROVEMENT_PROMPT,
        },
        {
          role: 'user',
          content: `Client: ${brief.clientName}\nIndustry: ${brief.industry}\nWebsite: ${brief.website}\nWeak tabs: ${qa.weakAreas.join(', ')}\nCurrent data:\n${JSON.stringify(weakData).slice(0, 12000)}`,
        },
      ],
      { workspaceId },
    );

    const parsed = this.extractJsonFromOutput(response);
    if (parsed?.sheets) {
      for (const [tab, rows] of Object.entries(parsed.sheets as Record<string, unknown>)) {
        if (Array.isArray(rows)) {
          sheets[tab] = this.mergeRows(sheets[tab], rows as Array<Record<string, string | number>>);
        }
      }
    }

    return sheets;
  }

  async generateAndSave(params: {
    workspaceId: string;
    clientId?: string;
    userId: string;
    taskId: string;
    brief: ResearchBrief;
    sheets: WorkbookSheetData;
    locationTabs: Record<string, Array<Record<string, string | number>>>;
  }): Promise<ResearchWorkbookResult> {
    let qa = scoreWorkbook(params.sheets, Object.keys(params.locationTabs).length);

    if (!qa.passed) {
      params.sheets = await this.improveWorkbook(params.sheets, qa, params.brief, params.workspaceId);
      qa = scoreWorkbook(params.sheets, Object.keys(params.locationTabs).length);
    }

    params.sheets['Final QA Score'] = buildFinalQAScoreRows(qa);

    const buffer = await this.builder.buildWorkbook(params.sheets, params.locationTabs);
    const fileName = getWorkbookFileName(params.brief.clientName, params.brief.industry);
    const dir = join(this.uploadRoot, params.workspaceId);
    await mkdir(dir, { recursive: true });
    const storagePath = `uploads/${params.workspaceId}/${Date.now()}_${fileName}`;
    const fullPath = join(this.uploadRoot, params.workspaceId, `${Date.now()}_${fileName}`);
    await writeFile(fullPath, buffer);

    const admin = this.supabase.getAdminClient();
    const { data: fileRow, error: fileErr } = await admin
      .from('files')
      .insert({
        workspace_id: params.workspaceId,
        client_id: params.clientId ?? null,
        uploaded_by: params.userId,
        file_name: fileName,
        file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        storage_path: storagePath,
        metadata: {
          task_id: params.taskId,
          qa_score: qa.finalScore,
          tab_count: VF_TAB_COUNT(params.sheets, params.locationTabs),
          research_mode: true,
        },
      })
      .select()
      .single();
    if (fileErr) throw fileErr;

    await admin.from('client_documents').insert({
      workspace_id: params.workspaceId,
      client_id: params.clientId ?? null,
      file_id: fileRow.id,
      file_name: fileName,
      file_type: 'xlsx',
      title: `${params.brief.clientName} VF SEO Master Research`,
      summary: `Valiant Firm 95+ SEO Master workbook. QA Score: ${qa.finalScore}/100. ${VF_TAB_COUNT(params.sheets, params.locationTabs)} tabs.`,
      metadata: { task_id: params.taskId, qa_score: qa.finalScore, generated: true },
    });

    await this.liveLogs.add(
      params.workspaceId,
      'success',
      `VF SEO Master workbook generated: ${fileName} (QA ${qa.finalScore}/100)`,
      { file_id: fileRow.id, tabs: VF_TAB_COUNT(params.sheets, params.locationTabs) },
      params.taskId,
      'manager',
    );

    const tabNames = [
      ...Object.keys(params.sheets),
      ...Object.keys(params.locationTabs).map((m) => locationTabName(m)),
    ];

    return {
      fileId: fileRow.id,
      fileName,
      downloadPath: `/api/v1/files/${fileRow.id}/download`,
      qaScore: qa,
      tabNames,
      summaryMarkdown: this.buildSummaryMarkdown(params.brief, qa, fileName, tabNames),
    };
  }

  buildSummaryMarkdown(
    brief: ResearchBrief,
    qa: WorkbookQAScore,
    fileName: string,
    tabNames: string[],
  ): string {
    return `# VF SEO Master Research Complete

## ${brief.clientName} — ${brief.industry}

**Workbook:** \`${fileName}\`  
**Final QA Score:** **${qa.finalScore}/100** ${qa.passed ? '✅ VF 95+ PASSED' : '⚠️ Needs strategist review'}

### Workbook tabs created (${tabNames.length})
${tabNames.map((t) => `- ${t}`).join('\n')}

### Data validation summary
- **Live Verified:** Connect GSC, GA4, GBP, Ahrefs/Semrush for live metrics
- **AI Estimated:** Keyword volumes, competitor DA/DR, traffic estimates (unless tools connected)
- **Needs Validation:** ${brief.missingFields.length ? brief.missingFields.join(', ') : 'Review Source Evidence tab'}

### Recommended next steps
1. Download the Excel workbook and review **Executive Dashboard** + **Final QA Score**
2. Validate AI Estimated metrics in **Source Evidence** tab before client delivery
3. Assign owners in **Implementation Tracker** and begin **30-Day Focus** tasks
4. Upload validated data sources to improve confidence labels on next run

### Weak areas addressed
${qa.weakAreas.length ? qa.weakAreas.map((w) => `- ${w}`).join('\n') : '- None — workbook meets VF 95+ standard'}
`;
  }

  private extractJsonFromOutput(output: string): Record<string, unknown> | null {
    const match = output.match(/```json\s*([\s\S]*?)```/i) || output.match(/\{[\s\S]*"sheets"[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[1] ?? match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private mergeRows(
    existing: Array<Record<string, string | number>> | undefined,
    incoming: Array<Record<string, string | number>>,
  ): Array<Record<string, string | number>> {
    return [...(existing ?? []), ...incoming];
  }

  private ensureMinimumDepth(
    sheets: WorkbookSheetData,
    brief: ResearchBrief,
    locationTabs: Record<string, Array<Record<string, string | number>>>,
  ): WorkbookSheetData {
    if ((sheets['Master Keywords']?.length ?? 0) < 10) {
      sheets['Master Keywords'] = [
        ...(sheets['Master Keywords'] ?? []),
        ...this.generateSeedKeywords(brief),
      ];
    }

    if ((sheets['Near Me Keywords']?.length ?? 0) < 5) {
      sheets['Near Me Keywords'] = [
        ...(sheets['Near Me Keywords'] ?? []),
        ...brief.services.slice(0, 5).flatMap((svc) =>
          brief.targetLocations.slice(0, 3).map((loc) => ({
            'Near Me Keyword': `${svc} near me ${loc.split(',')[0]}`,
            Service: svc,
            Location: loc,
            Market: loc,
            'Search Intent': 'Commercial',
            'Landing Page': `/services/${svc.toLowerCase().replace(/\s+/g, '-')}`,
            'Local Pack Relevance': 'High',
            'GBP Relevance': 'High',
            Priority: 'High',
            Confidence: 'AI Estimated',
            Notes: 'Validate with GSC/Local Falcon',
          })),
        ),
      ];
    }

    for (const market of brief.targetLocations.slice(0, 5)) {
      if (!locationTabs[market]?.length) {
        locationTabs[market] = brief.services.slice(0, 6).flatMap((svc) => ({
          Keyword: `${svc} ${market.split(',')[0]}`,
          'Keyword Type': 'City',
          Service: svc,
          Location: market,
          'Search Intent': 'Commercial',
          'Page Mapping': `/locations/${market.toLowerCase().replace(/\s+/g, '-')}`,
          'Priority Score': 8,
          'Validation Status': 'AI Estimated',
          Notes: '',
        }));
      }
    }

    if ((sheets['Service Pages']?.length ?? 0) < brief.services.length) {
      sheets['Service Pages'] = brief.services.map((svc, i) => ({
        Service: svc,
        'Target Keyword': `${svc} ${brief.mainLocation.split(',')[0]}`,
        URL: `/services/${svc.toLowerCase().replace(/\s+/g, '-')}`,
        'Supporting Keywords': `${svc} cost; ${svc} near me`,
        'Pain Points': 'Energy loss, comfort, cost',
        'Conversion Angle': 'Free estimate + licensed pros',
        'Required Sections': 'Hero, Benefits, Process, FAQ, CTA',
        'FAQ Questions': `How much does ${svc} cost?`,
        Schema: 'Service + FAQPage',
        'Internal Links': 'Homepage, related services, locations',
        CTA: 'Get Free Estimate',
        Priority: i + 1,
      }));
    }

    return sheets;
  }

  private generateSeedKeywords(brief: ResearchBrief): Array<Record<string, string | number>> {
    const types = ['Primary', 'Secondary', 'Commercial', 'Informational', 'Problem', 'AEO Question'];
    const rows: Array<Record<string, string | number>> = [];
    for (const svc of brief.services.slice(0, 4)) {
      for (const loc of brief.targetLocations.slice(0, 3)) {
        for (const type of types.slice(0, 2)) {
          rows.push({
            Keyword: type === 'AEO Question' ? `How much does ${svc} cost in ${loc}?` : `${svc} ${loc.split(',')[0]}`,
            'Keyword Type': type,
            Service: svc,
            Location: loc,
            Market: loc,
            'Search Intent': type === 'Informational' ? 'Informational' : 'Commercial',
            'Funnel Stage': type === 'Informational' ? 'Awareness' : 'Decision',
            Priority: 'High',
            'Estimated Volume': 'AI Estimated',
            'Estimated CPC': 'AI Estimated',
            'Estimated Difficulty': 'AI Estimated',
            'Commercial Intent Score': 8,
            'Local Intent Score': 9,
            'AEO Potential': type === 'AEO Question' ? 'High' : 'Medium',
            'GEO Potential': 'Medium',
            'Recommended Page': `/services/${svc.toLowerCase().replace(/\s+/g, '-')}`,
            'Current URL': 'TBD',
            'New URL Needed': 'Maybe',
            'Validation Status': 'AI Estimated',
            Source: 'VF Intelligence Engine',
            Notes: 'Validate with Ahrefs/Semrush/GSC',
          });
        }
      }
    }
    return rows;
  }

  private mapWeakAreaToSheet(area: string): string | null {
    const map: Record<string, string> = {
      'Executive Dashboard': 'Executive Dashboard',
      'Keyword Research': 'Master Keywords',
      'Market/Local SEO': 'Market Grouping',
      'Competitor Research': 'Competitor Matrix',
      'Content Architecture': 'Website Architecture',
      'AEO/GEO': 'AEO GEO AI Visibility',
      'Source Validation': 'Source Evidence',
    };
    return map[area] ?? null;
  }
}

function VF_TAB_COUNT(
  sheets: WorkbookSheetData,
  locationTabs: Record<string, unknown>,
): number {
  return Object.keys(sheets).length + Object.keys(locationTabs).length;
}
