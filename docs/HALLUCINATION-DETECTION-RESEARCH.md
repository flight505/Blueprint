# Blueprint Hallucination Detection & Mitigation Research (2026)

## Executive Summary

AI hallucinations represent a critical risk for Blueprint as a business planning and document generation tool. Research shows that even peer-reviewed papers from top institutions (NYU, Cambridge, MIT, Google) contain AI hallucinations that went undetected. For a tool generating business plans and research documents, we must implement SOTA detection and mitigation.

**Key Insight:** Hallucinations aren't bugs - they're **systemic incentive misalignments**. Models optimize for confident-sounding answers, not accuracy.

**Blueprint's Approach:** Transparency over evasion. Rather than generating content that "passes" AI detection (which undermines trust), Blueprint signals confidence levels, verifies citations, and enables human review of uncertain claims.

---

## 1. Detection Methods

### 1.1 Real-Time Detection (During Generation)

| Method | Accuracy | Latency | Description |
|--------|----------|---------|-------------|
| **Token Probability Analysis** | 0.71-0.87 AUROC | Real-time | Analyze logits during generation; outperforms self-expressed confidence |
| **Internal Representation Probing** | 86.4% | Real-time | Train lightweight classifiers on hidden states |
| **Semantic Energy** | 13%+ improvement over entropy | Real-time | Boltzmann-inspired energy from penultimate layer |
| **Linear Probing (SEPs)** | High | Near-zero overhead | Approximate semantic entropy from single forward pass |

**Implementation Notes:**
- Token probabilities consistently outperform models' self-expressed confidence (0.71-0.87 vs 0.52-0.68 AUROC)
- Models demonstrate "pervasive overconfidence" - expressing high certainty regardless of accuracy
- Mean pooling across final layer is optimal for representation probing

### 1.2 Post-Generation Detection

| Method | Effectiveness | Description | Source |
|--------|---------------|-------------|--------|
| **Chain-of-Verification (CoVe)** | 50-70% reduction | Decompose → Verify in isolation → Synthesize | - |
| **HalluClean** | Works across 5 NLP tasks | Plan → Reason → Judge → Revise (no external knowledge needed) | arXiv:2511.08916 ✅ |
| **HaluSearch** | Outperforms baselines (EN/CN) | Fast/slow thinking with MCTS tree search | ACL 2025 Findings ✅ |
| **Finch-Zk** | 6-39% F1 improvement | Cross-model consistency checking without external knowledge | EMNLP 2025 Industry ✅ |

**Chain-of-Verification Steps:**
1. Generate initial output
2. Decompose into verifiable claims
3. Execute verification queries in **isolated context** (prevents bias cascade)
4. Synthesize final verified result

### 1.3 Verified SOTA Frameworks (January 2026)

| Framework | Key Innovation | Performance | Venue |
|-----------|---------------|-------------|-------|
| **Root-Cause-Aware** (Pesaranghader) | 3-tier categorization: model/data/context causes | Financial domain case study | arXiv:2601.09929 ✅ |
| **HalluClean** | 4-step structural reasoning without training | Lightweight, interpretable | arXiv:2511.08916 ✅ |
| **HaluSearch** | Dual-process fast/slow thinking | Significant improvement on EN/CN datasets | ACL 2025 ✅ |
| **Finch-Zk** | Zero-knowledge cross-model consistency | **6-39% F1 improvement**, 9pp accuracy gain | EMNLP 2025 ✅ |
| **Reflexion** | Verbal reinforcement learning | 91% pass@1 on HumanEval | NeurIPS 2023 ✅ |

**Note on Reflexion:** Published at NeurIPS 2023 (arXiv:2303.11366), not ICLR 2026 as sometimes cited. Original paper by Shinn et al.

---

## 2. Grounding Techniques

### 2.1 Advanced RAG Architecture

**Evolution: RAG → Context Engineering**

Modern RAG separates "Search" and "Retrieve" stages:
- **Search stage**: Smaller chunks (100-256 tokens) for high recall/precision
- **Retrieve stage**: Larger chunks (1024+ tokens) for complete context

**Verified RAG Frameworks (2025-2026):**

| Framework | Key Innovation | Performance | Venue |
|-----------|---------------|-------------|-------|
| **DRAG** (Debate-Augmented RAG) | Multi-agent debate at retrieval + generation | Reduces "hallucination on hallucination" | ACL 2025 Long ✅ |
| **MEGA-RAG** | Multi-source retrieval + conflict resolution | **40%+ hallucination reduction**, 0.79 accuracy | Frontiers 2025 ✅ |
| **MultiRAG** | Multi-level confidence scoring across sources | Handles source inconsistencies | ICDE 2025 ✅ |

**Chunking Strategies (2025 benchmarks):**
| Strategy | Best For | Notes |
|----------|----------|-------|
| Page-level | Documents | 0.648 accuracy, lowest variance (NVIDIA winner) |
| Semantic | Topic coherence | +9% recall over simpler methods |
| Recursive character | General text | 400-512 tokens, 10-20% overlap |

### 2.2 Knowledge Graph Integration

- Link each reasoning step to graph-structured data
- Dynamic breadth-first search with hierarchical pruning
- **26.5%+ improvement** over Chain-of-Thought baselines on GRBench

**Double-Calibration Paradigm:**
- Explicitly estimate and propagate confidence through KG-augmented reasoning
- Evidence confidence crucial for final prediction calibration
- Ablating evidence confidence increases calibration error from ~4 to >20

### 2.3 Citation Verification

**Blueprint's Citation Verification Stack (Verified January 2026):**

| API | Coverage | Rate Limit | Best For |
|-----|----------|------------|----------|
| **OpenAlex** | 240M+ works | 100K credits/day | Title/author searches (broadest coverage) |
| **Crossref** | 180M DOIs | 5-10 RPS (polite pool) | DOI lookups (canonical registry) |
| **Semantic Scholar** | 214M papers | 1 RPS | Enrichment only (TLDRs, citation counts) |

**Hybrid Query Strategy:**
| Query Type | Primary | Fallback | Rationale |
|------------|---------|----------|-----------|
| **DOI available** | Crossref | OpenAlex | Crossref is the canonical DOI registry |
| **Title/author only** | OpenAlex | Crossref | OpenAlex has broader coverage (240M vs 180M) |

**Implementation Notes:**
- OpenAlex requires API key as of **February 13, 2026** (free but mandatory)
- Crossref: Use `mailto` parameter for polite pool (10 RPS vs 5 RPS public)
- Crossref: Use `query.bibliographic` for combined title/author/year matching
- Crossref: Use `select=DOI,title,author,container-title,published,type` to minimize response size

**Confidence Scoring:**
| Score | Status | Action |
|-------|--------|--------|
| 1.0 | Exact DOI match | Verified |
| ≥ 0.85 | High confidence | Auto-accept |
| 0.70-0.84 | Probable match | Flag for review |
| 0.50-0.69 | Uncertain | Manual verification needed |
| < 0.50 | Unlikely | Mark as unverified |

**Citation Verification Pipeline:**
1. Extract citations from generated content
2. Parse citation components (DOI, title, authors, year, journal)
3. **If DOI available:** Query Crossref first → OpenAlex fallback
4. **If title/author only:** Query OpenAlex first → Crossref fallback
5. Calculate match confidence using weighted scoring
6. Cache results in SQLite (DOI lookups: 7 days TTL, searches: 1 hour TTL)

---

## 3. Mitigation Strategies

### 3.1 Fine-Tuning Approaches

| Approach | Reduction | Domain |
|----------|-----------|--------|
| Targeted hallucination fine-tuning | 90-96% | Translation (5 language pairs) |
| Domain-specific fine-tuning | Substantial | Medical, legal, financial |
| RLHF with calibration-aware rewards | 96% vs 87% baseline | Vision-language |

**Key Insight:** Fine-tuning on hallucination-focused datasets is remarkably effective for domain-specific applications.

### 3.2 Multi-Model Cross-Verification

Use independent models to verify each other:
- Generate with Opus → Verify claims with Sonnet → Flag disagreements with Haiku
- Different model families catch different failure modes
- Cost-effective: use cheaper models for verification

**Verified Approach (Finch-Zk, EMNLP 2025):**
- Cross-model consistency checking with semantically-equivalent prompts
- **6-39% F1 improvement** on FELM hallucination detection
- **Up to 9pp accuracy improvement** on GPQA-diamond (Llama 4, Claude 4)
- No external knowledge sources required

### 3.3 Confidence Scoring

**Token Probabilities > Self-Expressed Confidence:**
- Models are "pervasively overconfident"
- Token probabilities provide granular calibration signals
- Useful for risk-based routing decisions

---

## 4. Commercial Tools Landscape

### 4.1 Detection Platforms

| Tool | Strength | Self-Host | Notes |
|------|----------|-----------|-------|
| **Galileo AI** | Real-time blocking | No | Hallucination Index, CI/CD integration |
| **Langfuse** | Open-source observability | Yes | LLM-as-judge evaluators, multi-level tracing |
| **Cleanlab TLM** | Trust scores | No | Spectrum of risk, not binary flags |
| **Patronus AI** | Explainable, transparent | Yes | Chain-of-thought feedback |
| **Arize AI** | Enterprise scale | No | Anomaly detection, embedding drift |
| **GPTZero** | Citation hallucination detection | No | Found 100+ hallucinations at NeurIPS 2025 |

### 4.2 Evaluation Frameworks

**RAGAS Metrics:**
- **Faithfulness**: Are answer claims supported by retrieved context?
- **Context Recall**: Did retrieval capture necessary evidence?
- **Answer Relevance**: Does output address the query?

---

## 5. Human-in-the-Loop Workflows

### 5.1 Risk-Based Routing

| Risk Level | Verification | Latency |
|------------|--------------|---------|
| Low (internal) | Async validation | Stream immediately |
| Medium (customer-facing) | Rule-based + ML | Hold for validation |
| High (financial/legal) | Full 3-layer + human | Human review required |

### 5.2 Three-Layer Review System

1. **Automated technical review**: Consistency, factual accuracy, unit tests
2. **Domain expert review**: Content-specific accuracy and relevance
3. **Final QA**: Compliance with requirements and standards

### 5.3 Clear Handover Points

Human judgment essential for:
- Ambiguous data where AI confidence is low
- High-value decisions with significant consequences
- Ethical or legal compliance concerns
- Creative inputs requiring brand voice

---

## 6. Blueprint Implementation Architecture

### 6.1 Proposed Pipeline

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 1: RAG Grounding                                 │
│  ├─ Retrieve relevant sources (hierarchical RAG)        │
│  ├─ Score source relevance                              │
│  ├─ Query OpenAlex/Crossref for citation metadata       │
│  └─ Attach citations to context                         │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 2: Constrained Generation                        │
│  ├─ System prompt enforcement                           │
│  ├─ Claim-by-claim generation with citations            │
│  └─ Token probability monitoring                        │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 3: Real-Time Detection                           │
│  ├─ Token probability threshold alerts                  │
│  ├─ Confidence score computation                        │
│  └─ Low-confidence segment flagging                     │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 4: Post-Generation Verification                  │
│  ├─ Citation verification (OpenAlex → Crossref → S2)    │
│  ├─ Cross-model consistency (Finch-Zk approach)         │
│  ├─ Chain-of-Verification on claims                     │
│  └─ Self-consistency check (for critical content)       │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 5: Risk-Based Routing                            │
│  ├─ Low risk → Direct output with confidence markers    │
│  ├─ Medium risk → Highlighted warnings                  │
│  └─ High risk → Human review queue                      │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 6: Output with Transparency                      │
│  ├─ Inline confidence indicators                        │
│  ├─ Expandable citation details                         │
│  ├─ Verification status badges                          │
│  └─ "Needs Review" flags for low-confidence sections    │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Citation Verification Service

```typescript
interface CitationVerificationService {
  // Primary: OpenAlex (240M+ works)
  verifyWithOpenAlex(citation: Citation): Promise<VerificationResult>;

  // Secondary: Crossref (authoritative DOI)
  verifyWithCrossref(doi: string): Promise<VerificationResult>;

  // Enrichment: Semantic Scholar (TLDRs, citation counts)
  enrichWithS2(paperId: string): Promise<EnrichmentResult>;

  // Fallback chain
  verify(citation: Citation): Promise<VerificationResult>;
}

interface VerificationResult {
  status: 'verified' | 'unverified' | 'contradicted' | 'partial';
  confidence: number; // 0-1
  source: 'openalex' | 'crossref' | 'semantic_scholar';
  metadata?: {
    title: string;
    authors: string[];
    year: number;
    doi?: string;
    citationCount?: number;
  };
  discrepancies?: string[]; // What didn't match
}
```

### 6.3 UI Features Required

1. **Confidence Indicators**
   - Color-coded confidence levels (green/yellow/red)
   - Hover to see confidence score and reasoning
   - Toggle to show/hide low-confidence content

2. **Citation Verification Panel**
   - Source preview on hover
   - "Verified" / "Unverified" / "Contradicted" badges
   - Link to original source
   - **NEW**: Show which API verified (OpenAlex, Crossref, etc.)

3. **Claim Decomposition View**
   - Break document into atomic claims
   - Each claim shows: source, confidence, verification status
   - Bulk verify / flag for review

4. **Hallucination Dashboard**
   - Per-document hallucination rate
   - Historical trends
   - Most common hallucination types
   - **NEW**: Citation verification success rate

5. **Human Review Queue**
   - Flagged sections for review
   - Accept / Reject / Edit workflow
   - Feedback loop to improve detection

---

## 7. User Stories for PRD

### Foundation Stories

**US-HAL-001: Confidence Scoring Infrastructure**
- Token probability extraction during generation
- Confidence score computation and storage
- Threshold configuration for alerts

**US-HAL-002: Citation Attachment System**
- Auto-attach citations during RAG generation
- Citation metadata storage
- Source-claim linking

**US-HAL-002a: Citation Verification API Integration** *(NEW)*
- OpenAlex API client with rate limiting
- Crossref API client with polite pool access
- Semantic Scholar enrichment
- SQLite cache with TTL for verified citations

### Detection Stories

**US-HAL-003: Real-Time Confidence Monitoring**
- Visual confidence indicator during streaming
- Low-confidence alerts
- Pause generation on critical threshold

**US-HAL-004: Chain-of-Verification Integration**
- Claim decomposition from generated content
- Isolated verification queries
- Verification result aggregation

**US-HAL-005: Citation Verification**
- Source retrieval and comparison
- Contradiction detection
- Verification status badges
- **NEW**: Multi-API fallback verification

**US-HAL-005a: Cross-Model Consistency Checking** *(NEW)*
- Implement Finch-Zk approach
- Semantically-equivalent prompt generation
- Fine-grained inconsistency detection
- Targeted correction of problematic segments

### UI Stories

**US-HAL-006: Inline Confidence Indicators**
- Color-coded text highlighting
- Hover tooltips with details
- Toggle visibility options

**US-HAL-007: Verification Status Panel**
- Document-level verification summary
- Claim-by-claim breakdown
- Export verification report
- **NEW**: Show verification source per citation

**US-HAL-008: Human Review Workflow**
- Flagged content queue
- Review interface with source comparison
- Accept/Reject/Edit actions

### Dashboard Stories

**US-HAL-009: Hallucination Analytics Dashboard**
- Per-document metrics
- Historical trends
- Category breakdown
- **NEW**: Citation verification analytics

---

## 8. Technical Considerations

### 8.1 Performance Budget

| Stage | Target Latency | Notes |
|-------|----------------|-------|
| RAG retrieval | <500ms | Async, can start before full query |
| Token probability | 0ms (piggyback) | Extract during generation |
| Confidence computation | <50ms | Lightweight calculation |
| Citation verification | 100-500ms | Cached results, parallel API calls |
| CoVe (optional) | 2-5s | Only for high-risk content |
| Cross-model check | 1-3s | Only for flagged content |

### 8.2 Storage Requirements

- Confidence scores per paragraph/claim
- Citation metadata and links
- Verification results and history (with source API)
- User feedback for model improvement
- **NEW**: Citation verification cache (SQLite)

### 8.3 API Rate Limit Management

| API | Rate Limit | Strategy |
|-----|------------|----------|
| OpenAlex | 100K credits/day | Primary, cache aggressively |
| Crossref | 10 RPS (polite) | DOI-only, include mailto |
| Semantic Scholar | 1 RPS | Enrichment only, batch where possible |

### 8.4 Model Requirements

- Access to token probabilities (logits)
- Ability to run verification prompts
- Cross-model API access for verification

---

## 9. Open Questions

1. **Verification depth**: How many claims to verify per document?
2. **User control**: Let users set verification strictness?
3. **Cost tradeoff**: Balance verification cost vs. accuracy?
4. **Offline mode**: What verification is possible without API?
5. **Domain tuning**: Different thresholds for different content types?
6. **Cache invalidation**: How long to cache citation verification results?

---

## 10. References (Verified January 2026)

### Verified Papers

1. Pesaranghader & Li (2026) - "Hallucination Detection and Mitigation in Large Language Models" - arXiv:2601.09929 ✅
2. Zhao & Zhang (2025) - "HalluClean: A Unified Framework to Combat Hallucinations" - arXiv:2511.08916 ✅
3. Hu et al. (2025) - "Removal of Hallucination on Hallucination: Debate-Augmented RAG" - ACL 2025 Long ✅
4. Xu et al. (2025) - "MEGA-RAG" - Frontiers in Public Health ✅
5. Wu et al. (2025) - "MultiRAG" - ICDE 2025 ✅
6. Cheng et al. (2025) - "Think More, Hallucinate Less: HaluSearch" - ACL 2025 Findings ✅
7. Goel et al. (2025) - "Zero-knowledge LLM hallucination detection (Finch-Zk)" - EMNLP 2025 Industry ✅
8. Shinn et al. (2023) - "Reflexion: Language Agents with Verbal Reinforcement Learning" - NeurIPS 2023 ✅
9. Liu et al. (2026) - "A hallucination detection and mitigation framework for faithful text summarization" - Nature Scientific Reports ✅

### API Documentation

10. OpenAlex API - https://docs.openalex.org/ (API key required Feb 2026)
11. Crossref REST API - https://github.com/CrossRef/rest-api-doc (rate limits updated Dec 2025)
12. Semantic Scholar API - https://api.semanticscholar.org/

### Other Sources

13. Maxim AI - Top hallucination detection tools 2025
14. Lakera - Guide to hallucinations in LLMs
15. RAGAS evaluation framework
16. GPTZero NeurIPS 2025 analysis (100+ hallucinated citations found)

---

## Changelog

- **2026-01-25**: Initial research compilation from Perplexity deep research
- **2026-01-25**: Added verified papers with exact citations (7/8 verified, Reflexion venue corrected)
- **2026-01-25**: Added citation verification API architecture (OpenAlex → Crossref → S2)
- **2026-01-25**: Added cross-model consistency approach (Finch-Zk)
- **2026-01-25**: Updated rate limits for Crossref (Dec 2025 changes)
- **2026-01-25**: Clarified transparency approach over detection evasion
- **2026-01-25**: Added hybrid query strategy (DOI→Crossref, Title→OpenAlex) with confidence scoring
