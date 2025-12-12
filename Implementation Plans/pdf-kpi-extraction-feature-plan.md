# PDF Document Upload and KPI Extraction Feature - Implementation Plan (Cost-Optimized)

## Executive Summary

This plan outlines the implementation of a PDF document upload feature that automatically extracts KPIs from distributor performance reports and integrates them with the existing GrowShip MVP dashboard system. The feature uses a **hybrid approach prioritizing template-based extraction** to minimize costs, with AI-powered extraction as a fallback only when templates don't match. This approach can **reduce AI costs by 60-70%** while maintaining high accuracy for consistent report formats.

## Feature Overview

### Business Requirements
- Upload PDF documents containing distributor performance reports
- Automatically extract key performance indicators (KPIs) from uploaded PDFs
- Store extracted KPIs against distributor profiles
- Compare extracted data with existing sales targets and performance metrics
- Integrate with existing dashboard visualization components

### Technical Scope
- PDF upload interface with drag-and-drop support
- **Template-based extraction system** for common report formats (primary approach)
- **AI-powered extraction** only as fallback for unmatched templates
- KPI mapping and validation system with confidence scoring
- Human review interface for low-confidence extractions
- Integration with existing distributor management system
- Dashboard updates to display extracted KPIs

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **PDF Processing**: unpdf or pdf-parse for text extraction
- **Template Engine**: Custom regex/rule-based extraction system
- **OCR**: Scribe.js (supports both text extraction and scanned PDFs)
- **AI Processing**: OpenAI GPT-4o (only for template fallback cases)
- **Storage**: Supabase Storage for PDF files
- **Database**: Supabase PostgreSQL for extracted KPIs
- **State Management**: TanStack React Query v5

### System Flow
1. User uploads PDF via drag-and-drop interface
2. PDF stored in Supabase Storage
3. Text extraction using PDF parsing library
4. OCR processing for scanned documents (if needed)
5. **Template matching** - Check if document matches known formats
6. **Template-based extraction** (60-70% of cases) OR **AI extraction** (30-40% fallback)
7. Confidence scoring for extracted data
8. Human review for low-confidence extractions
9. Data validation and mapping
10. Storage in database with distributor association
11. Real-time dashboard updates

## Detailed Implementation Plan

### Phase 1: Infrastructure Setup (Week 1)

#### 1.1 Database Schema Design
```sql
-- KPI extraction jobs table
CREATE TABLE kpi_extraction_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  distributor_id UUID REFERENCES user_profiles(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Extracted KPIs table
CREATE TABLE extracted_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_job_id UUID REFERENCES kpi_extraction_jobs(id),
  distributor_id UUID REFERENCES user_profiles(id),
  kpi_type TEXT NOT NULL,
  kpi_name TEXT NOT NULL,
  kpi_value JSONB NOT NULL,
  period_start DATE,
  period_end DATE,
  confidence_score FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KPI templates table for mapping
CREATE TABLE kpi_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  template_name TEXT NOT NULL,
  template_type TEXT CHECK (template_type IN ('regex', 'positional', 'keyword')),
  template_rules JSONB NOT NULL, -- Regex patterns, position rules, or keyword mappings
  kpi_mappings JSONB NOT NULL,
  sample_matches JSONB, -- Store examples of successful matches
  match_count INTEGER DEFAULT 0, -- Track usage for optimization
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 1.2 Environment Setup
- Add new environment variables:
  ```env
  OPENAI_API_KEY=your_openai_api_key
  PDF_STORAGE_BUCKET=pdf-documents
  MAX_PDF_SIZE_MB=25
  ```

#### 1.3 Install Dependencies
```bash
# Core PDF processing (no AI dependencies yet)
npm install unpdf pdf-parse
npm install -D @types/pdf-parse

# Delay these installations until Week 3:
# npm install scribe.js openai
```

### Phase 2: Week 1 - Robust PDF Text Extraction (No AI)

#### 2.1 PDF Upload API Route
Create `/app/api/kpi-extraction/upload/route.ts`:
- File validation (PDF format, size limits)
- Upload to Supabase Storage
- Create extraction job record
- Queue processing job

#### 2.2 PDF Processing Service
Create `/lib/services/pdf-processor.ts`:
- Text extraction using unpdf/pdf-parse
- Structure detection (tables, sections, headers)
- Text cleaning and normalization
- Page-by-page processing for large files
- Error handling and retry logic

#### 2.3 Text Analysis Service
Create `/lib/services/text-analyzer.ts`:
- Document structure analysis
- Section identification (revenue, sales, inventory, etc.)
- Table detection and parsing
- Key-value pair identification
- Number and currency extraction

#### 2.4 Testing Framework
- Create test suite with sample PDFs
- Test various PDF formats and structures
- Measure extraction accuracy
- Identify common patterns for Week 2 templates

### Phase 3: Week 2 - Template Creation for Common Report Formats

#### 3.1 Template Engine Development
Create `/lib/services/template-engine.ts`:
- Regex-based pattern matching for common KPIs
- Positional extraction for structured reports
- Keyword-based extraction for unstructured text
- Template matching algorithm
- Template confidence scoring

#### 3.2 Common Report Templates
Create templates for your 2-3 most common formats:

**Template 1: Standard Monthly Performance Report**
```typescript
{
  name: "monthly_performance_standard",
  patterns: {
    revenue: /Total Revenue:?\s*\$?([\d,]+\.?\d*)/i,
    units: /Units Sold:?\s*([\d,]+)/i,
    margin: /Profit Margin:?\s*([\d.]+)%/i,
    // Add more patterns based on actual reports
  }
}
```

**Template 2: Quarterly Business Review**
```typescript
{
  name: "quarterly_review",
  sections: {
    financial: { start: /Financial Summary/i, end: /Operations Summary/i },
    performance: { start: /Performance Metrics/i, end: /Next Steps/i }
  },
  extractors: {
    // Section-specific extraction rules
  }
}
```

#### 3.3 Template Testing & Refinement
- Test templates against sample PDFs
- Measure extraction accuracy
- Refine patterns based on failures
- Document template coverage percentage

#### 3.4 Frontend Components (Basic)
Create `/components/kpi-extraction/pdf-uploader.tsx`:
- Simple upload interface
- Display extraction results
- Show which template was used
- Basic error handling

### Phase 4: Week 3 - AI Extraction for Non-Template Documents

#### 4.1 AI Integration (Fallback Only)
Install AI dependencies:
```bash
npm install openai zod
```

Create `/lib/services/ai-fallback-extractor.ts`:
- Detect when templates don't match (confidence < 70%)
- Prepare document for AI processing
- Implement cost-optimized prompts
- Cache AI responses for similar documents

#### 4.2 Smart AI Usage
- **Template matching first**: Always try templates before AI
- **Partial AI extraction**: Only send unmatched sections to AI
- **Learning system**: Save successful AI extractions as new template patterns
- **Cost tracking**: Monitor AI usage per extraction

#### 4.3 AI Prompt Optimization
Cost-effective prompt structure:
```typescript
const costOptimizedPrompt = `
Extract ONLY these specific KPIs from the text:
- Total Revenue (number + currency)
- Units Sold (number only)
- Profit Margin (percentage)

Return ONLY the JSON values, no explanations:
{"revenue": X, "units": Y, "margin": Z}
`;
```

#### 4.4 Hybrid Processing Pipeline
```typescript
async function extractKPIs(pdfText: string) {
  // Step 1: Try template matching
  const templateResult = await templateEngine.match(pdfText);
  
  if (templateResult.confidence > 0.7) {
    return templateResult.kpis; // No AI needed!
  }
  
  // Step 2: AI fallback for unmatched sections only
  const unmatchedSections = templateResult.unmatchedSections;
  const aiResults = await aiFallback.extract(unmatchedSections);
  
  // Step 3: Combine results
  return mergeResults(templateResult.kpis, aiResults);
}

### Phase 5: Week 4 - Confidence Scoring, Human Review UI & Testing

#### 5.1 Confidence Scoring System
Create `/lib/services/confidence-scorer.ts`:
- Template match confidence (0-100%)
- Individual KPI confidence scores
- Overall extraction confidence
- Factors: pattern strength, value validation, context matching

```typescript
interface ConfidenceScore {
  overall: number;
  breakdown: {
    templateMatch: number;
    valueValidation: number;
    contextRelevance: number;
  };
  requiresReview: boolean; // true if < 80%
}
```

#### 5.2 Human Review Interface
Create `/components/kpi-extraction/review-interface.tsx`:
- Side-by-side PDF viewer and extracted data
- Highlight low-confidence fields
- Edit extracted values inline
- Approve/reject individual KPIs
- Save corrections as new template patterns

#### 5.3 Learning & Optimization
- Track manual corrections
- Update templates based on corrections
- Identify new patterns from reviews
- Measure template vs AI usage ratio
- Cost analysis dashboard

#### 5.4 Comprehensive Testing
- Test with 50+ real distributor PDFs
- Measure template coverage (target: 60-70%)
- Calculate cost savings vs pure AI
- Performance benchmarks
- Edge case handling


## Technical Implementation Details

### 1. Cost-Optimized Extraction Pipeline
```typescript
// Hybrid extraction system
interface HybridKPIExtractor {
  // Primary: Template-based extraction (60-70% of cases)
  extractWithTemplates(text: string): Promise<{
    kpis: ExtractedKPI[];
    confidence: number;
    matchedTemplate: string | null;
  }>;
  
  // Fallback: AI extraction (30-40% of cases)
  extractWithAI(text: string, failedSections: string[]): Promise<{
    kpis: ExtractedKPI[];
    cost: number; // Track API costs
  }>;
  
  // Combined approach
  extractKPIs(pdfText: string): Promise<{
    kpis: ExtractedKPI[];
    method: 'template' | 'ai' | 'hybrid';
    confidence: number;
    aiCost?: number;
  }>;
}
```

### 2. Template Engine Example
```typescript
class TemplateEngine {
  private templates: Template[] = [
    {
      name: 'monthly_sales_report_v1',
      confidence_threshold: 0.7,
      patterns: {
        revenue: {
          regex: /(?:Total|Gross)?\s*Revenue:?\s*\$?([\d,]+(?:\.\d{2})?)/i,
          validation: (value: string) => {
            const num = parseFloat(value.replace(/,/g, ''));
            return num > 0 && num < 10000000; // Reasonable bounds
          }
        },
        units_sold: {
          regex: /Units?\s*Sold:?\s*([\d,]+)/i,
          validation: (value: string) => parseInt(value.replace(/,/g, '')) > 0
        },
        profit_margin: {
          regex: /Profit\s*Margin:?\s*([\d.]+)%/i,
          validation: (value: string) => {
            const pct = parseFloat(value);
            return pct >= 0 && pct <= 100;
          }
        }
      }
    }
  ];
  
  async match(text: string): Promise<TemplateMatchResult> {
    // Try each template and return best match
    for (const template of this.templates) {
      const result = await this.tryTemplate(text, template);
      if (result.confidence > template.confidence_threshold) {
        return result;
      }
    }
    return { matched: false, confidence: 0 };
  }
}
```

### 3. Cost Tracking System
```typescript
// Track and optimize AI usage
interface CostTracker {
  logExtraction(jobId: string, details: {
    method: 'template' | 'ai' | 'hybrid';
    tokensUsed?: number;
    apiCost?: number;
    templateUsed?: string;
  }): void;
  
  getMonthlyStats(): {
    totalExtractions: number;
    templateSuccessRate: number;
    aiUsageRate: number;
    totalCost: number;
    avgCostPerExtraction: number;
    potentialSavings: number;
  };
}
```

### 4. React Components for Review
```typescript
// Human review interface for low-confidence extractions
export const KPIReviewInterface: React.FC<{extraction: Extraction}> = ({ extraction }) => {
  const [edits, setEdits] = useState<Record<string, any>>({});
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <PDFViewer url={extraction.fileUrl} />
      <div className="space-y-4">
        {extraction.kpis.map((kpi) => (
          <KPIField
            key={kpi.id}
            kpi={kpi}
            confidence={kpi.confidence}
            isLowConfidence={kpi.confidence < 0.8}
            onChange={(value) => setEdits({...edits, [kpi.id]: value})}
          />
        ))}
        <ConfidenceIndicator overall={extraction.overallConfidence} />
        <SaveAsTemplateButton extraction={extraction} edits={edits} />
      </div>
    </div>
  );
};

## Risk Mitigation

### Technical Risks
1. **Template Coverage**: Start with most common formats, expand based on usage data
2. **Pattern Maintenance**: Version control templates, A/B test improvements
3. **AI Fallback Reliability**: Cache successful AI extractions as new patterns
4. **Performance**: Process templates in parallel, optimize regex patterns

### Business Risks
1. **Initial Template Creation**: Requires upfront analysis of report formats
2. **Change Management**: Train users on review process for low-confidence extractions
3. **Cost Overruns**: Set monthly AI usage budgets and alerts
4. **Template Drift**: Regular reviews to update patterns as report formats evolve

## Success Metrics

### Cost Optimization Metrics
- **Template Success Rate**: Target 60-70% (no AI needed)
- **AI Usage Rate**: Target < 40% of extractions
- **Cost per Extraction**: Target 70% reduction vs pure AI
- **Monthly AI Spend**: Track and optimize to stay under budget

### Technical Metrics
- **Average Extraction Time**: < 10 seconds for templates, < 30 seconds with AI
- **Confidence Score Distribution**: 80%+ high confidence (no review needed)
- **Template Library Growth**: Add 2-3 new templates per month from patterns
- **Human Review Time**: < 2 minutes per document

### Business Metrics
- **ROI Timeline**: Positive ROI within 2 months from launch
- **Time Saved**: 80% reduction in manual data entry
- **Accuracy**: 95%+ with human review
- **User Adoption**: 75%+ within first month

## Timeline Summary (Cost-Optimized Approach)

- **Week 1**: Build robust PDF text extraction (no AI costs)
- **Week 2**: Create 2-3 templates for most common report formats (regex/rule-based)
- **Week 3**: Add AI extraction only for documents that don't match templates
- **Week 4**: Confidence scoring, human review UI, and comprehensive testing

Total estimated development time: 4 weeks with 2 developers

## Cost Analysis

### Traditional AI-Only Approach
- Average tokens per PDF: ~2,000 tokens
- Cost per extraction: ~$0.06 (GPT-4o pricing)
- Monthly volume: 1,000 PDFs
- **Monthly cost: $60**

### Hybrid Template-First Approach
- Template success rate: 60-70%
- AI needed for: 30-40% of PDFs
- Cost per AI extraction: ~$0.06
- Monthly AI extractions: ~350
- **Monthly cost: $21**
- **Savings: $39/month (65% reduction)**

### ROI Calculation
- Development cost: 2 developers × 4 weeks = ~$20,000
- Monthly savings: $39 (AI) + $2,000 (labor reduction)
- **Payback period: ~10 months**
- **Year 1 net benefit: $4,468**

## Next Steps

1. **Gather Sample PDFs**: Collect 20-30 distributor reports to analyze patterns
2. **Pattern Analysis**: Identify the 2-3 most common report formats
3. **Template Design**: Create initial regex patterns based on analysis
4. **Development Setup**: Create feature branch and install minimal dependencies
5. **Weekly Reviews**: Track template success rate and cost savings

## Sample Template Patterns

### Example 1: Standard Sales Report
```typescript
const standardSalesTemplate = {
  name: "standard_sales_report",
  identifiers: ["Monthly Sales Report", "Distributor Performance"],
  patterns: {
    total_revenue: /Total Revenue:?\s*\$?([\d,]+(?:\.\d{2})?)/i,
    units_sold: /(?:Total |)Units Sold:?\s*([\d,]+)/i,
    profit_margin: /(?:Gross |)Profit Margin:?\s*([\d.]+)%/i,
    customer_count: /(?:Active |Total |)Customers:?\s*([\d,]+)/i,
    return_rate: /Return Rate:?\s*([\d.]+)%/i
  }
};
```

### Example 2: Table-Based Report
```typescript
const tableBasedTemplate = {
  name: "table_based_metrics",
  tableIdentifiers: ["KPI", "Metric", "Value", "Target"],
  extractors: {
    findTable: (text: string) => {
      // Logic to identify and parse tables
    },
    extractFromTable: (table: string[][]) => {
      // Map specific rows/columns to KPIs
    }
  }
};

## Appendix: Technology References

### Libraries Documentation
- [unpdf](https://github.com/unjs/unpdf) - Modern PDF text extraction
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - Alternative PDF parser
- [Scribe.js](https://github.com/scribeocr/scribe.js) - OCR for scanned PDFs
- [OpenAI API](https://platform.openai.com/docs) - GPT-4o integration

### Existing Codebase References
- File Upload: `/components/import/FileUploader.tsx`
- AI Integration: `/Backend/app/utils/openai_mapper.py`
- Dashboard Hooks: `/hooks/use-dashboard-metrics.ts`
- Distributor Management: `/types/relationships.ts`