/**
 * Claude AI Analyzer
 * Integrates with Anthropic SDK for project analysis with prompt caching
 */

import Anthropic from '@anthropic-ai/sdk';
import { ProjectContext, AnalysisResult, AnalysisMetadata, TechStack, Recommendation, EstimatedValue } from '../types';
import logger from '../utils/logger';

export class ClaudeAnalyzer {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(apiKey: string, config?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }) {
    this.client = new Anthropic({ apiKey });
    this.model = config?.model || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config?.maxTokens || 4096;
    this.temperature = config?.temperature || 0.7;
  }

  /**
   * Analyze project using Claude with prompt caching
   */
  async analyzeProject(
    context: ProjectContext,
    projectId: string,
    abortSignal?: AbortSignal
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    logger.info(`🤖 Starting AI analysis for project: ${context.name}`);

    try {
      // Build prompt with context
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(context);

      // Call Claude API with prompt caching and abort signal
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              cache_control: { type: 'ephemeral' } as any, // Cache system prompt
            } as any,
          ],
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        },
        {
          signal: abortSignal,
        }
      );

      // Parse response
      if (!response.content || response.content.length === 0) {
        throw new Error('Empty response from Claude API');
      }

      const analysisText = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      const parsedAnalysis = this.parseAnalysisResponse(analysisText);

      // Build metadata
      const metadata: AnalysisMetadata = {
        model: this.model,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        cacheHit: (response.usage as any).cache_read_input_tokens > 0,
        cacheRead: (response.usage as any).cache_read_input_tokens,
        cacheCreation: (response.usage as any).cache_creation_input_tokens,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };

      const result: AnalysisResult = {
        projectId,
        ...parsedAnalysis,
        metadata,
      };

      logger.info(
        `✅ Analysis complete: ${metadata.tokensUsed} tokens, ` +
        `cache ${metadata.cacheHit ? 'HIT' : 'MISS'}, ${metadata.duration}ms`
      );

      return result;
    } catch (error: any) {
      // Check for abort errors (request was cancelled)
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        logger.warn(`⚠️  API request was aborted (timeout)`);
        throw new Error('Analysis request timed out and was cancelled');
      }

      // Check for rate limit errors
      if (error.status === 429 || error.message?.includes('rate_limit')) {
        logger.warn(`⚠️  Rate limit exceeded. Job will be retried automatically.`);
        throw new Error(`Rate limit exceeded: ${error.message}`);
      }

      // Check for overloaded errors
      if (error.status === 529 || error.message?.includes('overloaded')) {
        logger.warn(`⚠️  API overloaded. Job will be retried automatically.`);
        throw new Error(`API overloaded: ${error.message}`);
      }

      logger.error(`AI analysis failed: ${error}`);
      throw error;
    }
  }

  /**
   * Build system prompt (cacheable)
   */
  private buildSystemPrompt(): string {
    return `You are an expert software architect, code analyst, and business valuator. Your task is to analyze development projects and provide comprehensive insights including technical assessment, maturity level, and business value estimation.

When analyzing a project, you must:
1. Identify all technologies, frameworks, and libraries used
2. Assess the project's complexity and architecture
3. Evaluate project completeness and maturity (POC, MVP, Production-Ready, Enterprise)
4. Identify what's needed to reach production/ship level
5. Estimate potential monetary value in GBP (£) for both SaaS and IP sale
6. Provide specific, actionable recommendations for improvements

Return your analysis in the following JSON format:
{
  "summary": "A concise 2-3 sentence overview of what this project does and its key characteristics",
  "techStack": {
    "frontend": ["list of frontend technologies"],
    "backend": ["list of backend technologies"],
    "database": ["list of databases"],
    "devOps": ["list of devops tools"],
    "testing": ["list of testing frameworks"],
    "other": ["other notable tools/libraries"]
  },
  "complexity": "simple|moderate|complex|very-complex",
  "completionScore": 0-100,
  "maturityLevel": "poc|mvp|production-ready|enterprise",
  "productionGaps": ["List of things needed to make it production/ship ready"],
  "estimatedValue": {
    "currency": "GBP",
    "saasMonthly": {
      "min": 0,
      "max": 0,
      "confidence": "low|medium|high"
    },
    "ipSale": {
      "min": 0,
      "max": 0,
      "confidence": "low|medium|high"
    },
    "reasoning": "Explanation of value estimation considering market, tech stack, completeness, scalability"
  },
  "recommendations": [
    {
      "type": "security|performance|architecture|tooling|documentation",
      "title": "Short title",
      "description": "Detailed recommendation",
      "priority": "low|medium|high"
    }
  ]
}

Maturity Levels:
- poc: Proof of concept - basic functionality, not production ready
- mvp: Minimum viable product - core features work, needs polish
- production-ready: Ready to ship with proper error handling, security, testing
- enterprise: Enterprise-grade with scalability, monitoring, comprehensive testing

Value Estimation Guidelines:
- Consider the niche/market size, tech stack quality, code maturity, scalability potential
- SaaS monthly: recurring revenue potential per month
- IP Sale: one-time sale of entire project/codebase
- Be realistic - most side projects are £50-500/month SaaS or £5k-50k IP sale
- Enterprise solutions can be £1k-10k+/month SaaS or £50k-500k+ IP sale

Be specific, realistic, and actionable in your assessments.`;
  }

  /**
   * Build user prompt with project context
   */
  private buildUserPrompt(context: ProjectContext): string {
    let prompt = `Analyze this development project:\n\n`;
    prompt += `**Project Name:** ${context.name}\n`;
    prompt += `**Total Files:** ${context.fileCount}\n`;
    prompt += `**Lines of Code:** ${context.linesOfCode.toLocaleString()}\n`;
    prompt += `**Project Size:** ${this.formatBytes(context.totalSize)}\n\n`;

    if (context.readme) {
      prompt += `**README:**\n\`\`\`markdown\n${context.readme}\n\`\`\`\n\n`;
    }

    if (context.packageJson) {
      prompt += `**Package Info:**\n\`\`\`json\n${JSON.stringify(context.packageJson, null, 2)}\n\`\`\`\n\n`;
    }

    if (context.mainFiles.length > 0) {
      prompt += `**Key Source Files:**\n\n`;
      for (const file of context.mainFiles.slice(0, 10)) { // Limit to 10 files
        prompt += `--- ${file.path} (${file.language}) ---\n`;
        prompt += `\`\`\`${file.language}\n${file.content}\n\`\`\`\n\n`;
      }
    }

    prompt += `\nProvide your analysis in the specified JSON format.`;

    return prompt;
  }

  /**
   * Parse Claude's JSON response
   */
  private parseAnalysisResponse(responseText: string): {
    summary: string;
    techStack: TechStack;
    complexity: 'simple' | 'moderate' | 'complex' | 'very-complex';
    recommendations: Recommendation[];
    completionScore: number;
    maturityLevel: 'poc' | 'mvp' | 'production-ready' | 'enterprise';
    productionGaps: string[];
    estimatedValue: EstimatedValue;
  } {
    try {
      // Extract JSON from response (Claude might wrap it in markdown)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                       responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      return {
        summary: parsed.summary || 'No summary provided',
        techStack: parsed.techStack || {},
        complexity: parsed.complexity || 'moderate',
        recommendations: parsed.recommendations || [],
        completionScore: parsed.completionScore || 0,
        maturityLevel: parsed.maturityLevel || 'poc',
        productionGaps: parsed.productionGaps || [],
        estimatedValue: parsed.estimatedValue || {
          currency: 'GBP',
          saasMonthly: { min: 0, max: 0, confidence: 'low' },
          ipSale: { min: 0, max: 0, confidence: 'low' },
          reasoning: 'Value estimation not available',
        },
      };
    } catch (error) {
      logger.error(`Failed to parse analysis response: ${error}`);

      // Return fallback analysis
      return {
        summary: 'Analysis parsing failed. Please review manually.',
        techStack: {},
        complexity: 'moderate',
        recommendations: [
          {
            type: 'tooling',
            title: 'Analysis Error',
            description: 'The AI analysis could not be properly parsed. Manual review recommended.',
            priority: 'high',
          },
        ],
        completionScore: 0,
        maturityLevel: 'poc',
        productionGaps: ['Analysis failed - manual review required'],
        estimatedValue: {
          currency: 'GBP',
          saasMonthly: { min: 0, max: 0, confidence: 'low' },
          ipSale: { min: 0, max: 0, confidence: 'low' },
          reasoning: 'Analysis parsing failed',
        },
      };
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      logger.error(`API connection test failed: ${error}`);
      return false;
    }
  }
}
