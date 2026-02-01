/**
 * Figma MCP Integration for LukeUX
 *
 * This module provides utilities for extracting design context from Figma
 * using the Model Context Protocol (MCP) for deeper AI analysis.
 *
 * Usage:
 * - Parse Figma URLs to extract fileKey and nodeId
 * - Format requests for MCP tools
 * - Process MCP responses for LukeUX analysis engines
 */

export interface FigmaUrlParts {
  fileKey: string;
  nodeId?: string;
  fileName?: string;
  isBranch?: boolean;
  branchKey?: string;
}

/**
 * Parse a Figma URL to extract file key and node ID
 * Supports formats:
 * - https://www.figma.com/design/:fileKey/:fileName?node-id=1-2
 * - https://www.figma.com/file/:fileKey/:fileName?node-id=1-2
 * - https://www.figma.com/design/:fileKey/branch/:branchKey/:fileName
 * - https://figma.com/board/:fileKey/:fileName?node-id=1-2 (FigJam)
 */
export function parseFigmaUrl(url: string): FigmaUrlParts | null {
  try {
    const parsed = new URL(url);

    if (!parsed.hostname.includes('figma.com')) {
      return null;
    }

    const pathParts = parsed.pathname.split('/').filter(Boolean);

    // Handle different URL formats
    let fileKey: string | undefined;
    let fileName: string | undefined;
    let isBranch = false;
    let branchKey: string | undefined;

    if (pathParts[0] === 'design' || pathParts[0] === 'file' || pathParts[0] === 'board') {
      fileKey = pathParts[1];

      // Check for branch format
      if (pathParts[2] === 'branch' && pathParts[3]) {
        isBranch = true;
        branchKey = pathParts[3];
        fileName = pathParts[4];
        // For branches, use branchKey as the effective fileKey
        fileKey = branchKey;
      } else {
        fileName = pathParts[2];
      }
    }

    if (!fileKey) {
      return null;
    }

    // Extract node ID from query params (format: 1-2 becomes 1:2)
    let nodeId = parsed.searchParams.get('node-id');
    if (nodeId) {
      nodeId = nodeId.replace('-', ':');
    }

    return {
      fileKey,
      nodeId: nodeId || undefined,
      fileName: fileName ? decodeURIComponent(fileName) : undefined,
      isBranch,
      branchKey,
    };
  } catch {
    return null;
  }
}

/**
 * Validate if a string is a valid Figma URL
 */
export function isValidFigmaUrl(url: string): boolean {
  return parseFigmaUrl(url) !== null;
}

/**
 * Format Figma context for LukeUX analysis prompts
 */
export function formatFigmaContextForAnalysis(
  designContext: {
    code?: string;
    metadata?: string;
    assets?: Record<string, string>;
    variables?: Record<string, string>;
    codeConnect?: Record<string, { codeConnectSrc: string; codeConnectName: string }>;
  },
  analysisType: 'design-system' | 'layout' | 'flow' | 'comments' | 'full'
): string {
  const sections: string[] = [];

  sections.push('## Figma Design Context\n');

  if (designContext.code) {
    sections.push('### Generated Code Structure');
    sections.push('```');
    sections.push(designContext.code);
    sections.push('```\n');
  }

  if (designContext.metadata) {
    sections.push('### Design Metadata');
    sections.push(designContext.metadata);
    sections.push('');
  }

  if (designContext.variables && Object.keys(designContext.variables).length > 0) {
    sections.push('### Design Variables/Tokens');
    for (const [name, value] of Object.entries(designContext.variables)) {
      sections.push(`- ${name}: ${value}`);
    }
    sections.push('');
  }

  if (designContext.codeConnect && Object.keys(designContext.codeConnect).length > 0) {
    sections.push('### Code Connect Mappings');
    for (const [nodeId, mapping] of Object.entries(designContext.codeConnect)) {
      sections.push(`- Node ${nodeId}: ${mapping.codeConnectName} (${mapping.codeConnectSrc})`);
    }
    sections.push('');
  }

  if (designContext.assets && Object.keys(designContext.assets).length > 0) {
    sections.push('### Assets');
    sections.push(`${Object.keys(designContext.assets).length} assets referenced`);
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Build analysis prompt with Figma context for LukeUX engines
 */
export function buildAnalysisPrompt(
  engine: 'design-system' | 'layout' | 'flow' | 'comments' | 'fidelity',
  figmaContext: string,
  userPrompt?: string
): string {
  const enginePrompts: Record<string, string> = {
    'design-system': `You are the LukeUX Design System Integrity Engine.

Analyze the following Figma design context for:
- Component reuse vs duplication
- Variant completeness (states, properties)
- Token usage vs hardcoded overrides
- Naming consistency and survivability
- Local overrides indicating system drift

${figmaContext}

${userPrompt ? `Additional context: ${userPrompt}` : ''}

Provide your analysis using the required LukeUX output structure:
1. What LukeUX Checked
2. What Was Found
3. Evidence
4. Risk / Impact
5. How LukeUX Helps
6. What's Missing (if applicable)`,

    'layout': `You are the LukeUX Layout & Hierarchy Validation Engine.

Analyze the following Figma design context for:
- Alignment consistency
- Density variation
- Hierarchy clarity across screens
- Auto Layout correctness
- Responsive behavior signals

${figmaContext}

${userPrompt ? `Additional context: ${userPrompt}` : ''}

Provide your analysis using the required LukeUX output structure:
1. What LukeUX Checked
2. What Was Found
3. Evidence
4. Risk / Impact
5. How LukeUX Helps
6. What's Missing (if applicable)`,

    'flow': `You are the LukeUX Flow & Journey Integrity Engine.

Analyze the following Figma design context for:
- Entry points
- Exit states
- Dead ends
- Circular navigation
- Modal traps
- Undefined success states

${figmaContext}

${userPrompt ? `Additional context: ${userPrompt}` : ''}

Provide your analysis using the required LukeUX output structure:
1. What LukeUX Checked
2. What Was Found
3. Evidence
4. Risk / Impact
5. How LukeUX Helps
6. What's Missing (if applicable)`,

    'comments': `You are the LukeUX Comment Intelligence Engine.

Analyze the following Figma design context for:
- Unresolved comments on critical paths
- Contradictory feedback
- Late-stage requirement changes
- Known issues acknowledged but not designed for
- Constraints implied in comments but not reflected in UI

${figmaContext}

${userPrompt ? `Additional context: ${userPrompt}` : ''}

Provide your analysis using the required LukeUX output structure:
1. What LukeUX Checked
2. What Was Found
3. Evidence
4. Risk / Impact
5. How LukeUX Helps
6. What's Missing (if applicable)`,

    'fidelity': `You are a UX conversion engine for LukeUX.

Convert the following high-fidelity Figma design into an exact low-fidelity representation.

Rules:
- Preserve layout, hierarchy, grouping, and text exactly
- No visual enhancement
- No interpretation
- No missing elements added
- If it is not visible, it does not exist

${figmaContext}

${userPrompt ? `Additional context: ${userPrompt}` : ''}

Output a low-fidelity wireframe description suitable for structural review.`,
  };

  return enginePrompts[engine] || figmaContext;
}

/**
 * Extract analysis type from user prompt
 */
export function detectAnalysisType(prompt: string): 'design-system' | 'layout' | 'flow' | 'comments' | 'fidelity' | 'full' {
  const lowered = prompt.toLowerCase();

  if (lowered.includes('component') || lowered.includes('design system') || lowered.includes('token') || lowered.includes('variant')) {
    return 'design-system';
  }
  if (lowered.includes('layout') || lowered.includes('spacing') || lowered.includes('alignment') || lowered.includes('hierarchy')) {
    return 'layout';
  }
  if (lowered.includes('flow') || lowered.includes('journey') || lowered.includes('navigation') || lowered.includes('prototype')) {
    return 'flow';
  }
  if (lowered.includes('comment') || lowered.includes('feedback') || lowered.includes('review')) {
    return 'comments';
  }
  if (lowered.includes('wireframe') || lowered.includes('low-fi') || lowered.includes('low fidelity') || lowered.includes('lofi')) {
    return 'fidelity';
  }

  return 'full';
}
