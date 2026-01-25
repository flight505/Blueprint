# Blueprint Hallucination Detection & Mitigation Research (2026)

## Executive Summary

AI hallucinations represent a critical risk for Blueprint as a business planning and document generation tool. Research shows that even peer-reviewed papers from top institutions (NYU, Cambridge, MIT, Google) contain AI hallucinations that went undetected. For a tool generating business plans and research documents, we must implement SOTA detection and mitigation.

**Key Insight:** Hallucinations aren't bugs - they're **systemic incentive misalignments**. Models optimize for confident-sounding answers, not accuracy.

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

| Method | Effectiveness | Description |
|--------|---------------|-------------|
| **Chain-of-Verification (CoVe)** | 50-70% reduction | Decompose → Verify in isolation → Synthesize |
| **White-box CoV** | 92.47% AUROC | Inspect computational graphs and attribution |
| **Self-Verification** | 11% hallucination rate | Model critiques own responses against external sources |
| **Self-Consistency** | Varies | Generate n=9 responses, select most consistent |

**Chain-of-Verification Steps:**
1. Generate initial output
2. Decompose into verifiable claims
3. Execute verification queries in **isolated context** (prevents bias cascade)
4. Synthesize final verified result

---

## 2. Grounding Techniques

### 2.1 Advanced RAG Architecture

**Evolution: RAG → Context Engineering**

Modern RAG separates "Search" and "Retrieve" stages:
- **Search stage**: Smaller chunks (100-256 tokens) for high recall/precision
- **Retrieve stage**: Larger chunks (1024+ tokens) for complete context

**Hierarchical Retrieval:**
- **TreeRAG**: Navigate tree structures to combine semantically related fragments
- **GraphRAG**: Entity-relationship networks for physically distant but related content
- **Hybrid**: Combine tree + graph for comprehensive coverage

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

**Hybrid Fact-Checking Pipeline:**
1. Rapid one-hop lookups in knowledge graphs (DBpedia)
2. LLM-based classification with task-specific prompts
3. Web search agents for insufficient KG coverage

**Result:** 0.93 F1 on FEVER benchmark without task-specific fine-tuning

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
| **Future AGI** | Research-driven | No | RAG metrics, agent-as-judge |

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
│  ├─ Chain-of-Verification on claims                     │
│  ├─ Citation validation against sources                 │
│  ├─ Cross-model verification (optional)                 │
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

### 6.2 UI Features Required

1. **Confidence Indicators**
   - Color-coded confidence levels (green/yellow/red)
   - Hover to see confidence score and reasoning
   - Toggle to show/hide low-confidence content

2. **Citation Verification Panel**
   - Source preview on hover
   - "Verified" / "Unverified" / "Contradicted" badges
   - Link to original source

3. **Claim Decomposition View**
   - Break document into atomic claims
   - Each claim shows: source, confidence, verification status
   - Bulk verify / flag for review

4. **Hallucination Dashboard**
   - Per-document hallucination rate
   - Historical trends
   - Most common hallucination types

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

### UI Stories

**US-HAL-006: Inline Confidence Indicators**
- Color-coded text highlighting
- Hover tooltips with details
- Toggle visibility options

**US-HAL-007: Verification Status Panel**
- Document-level verification summary
- Claim-by-claim breakdown
- Export verification report

**US-HAL-008: Human Review Workflow**
- Flagged content queue
- Review interface with source comparison
- Accept/Reject/Edit actions

### Dashboard Stories

**US-HAL-009: Hallucination Analytics Dashboard**
- Per-document metrics
- Historical trends
- Category breakdown

---

## 8. Technical Considerations

### 8.1 Performance Budget

| Stage | Target Latency | Notes |
|-------|----------------|-------|
| RAG retrieval | <500ms | Async, can start before full query |
| Token probability | 0ms (piggyback) | Extract during generation |
| Confidence computation | <50ms | Lightweight calculation |
| CoVe (optional) | 2-5s | Only for high-risk content |
| Citation verification | 1-2s | Batch process post-generation |

### 8.2 Storage Requirements

- Confidence scores per paragraph/claim
- Citation metadata and links
- Verification results and history
- User feedback for model improvement

### 8.3 Model Requirements

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

---

## 10. References

1. Maxim AI - Top hallucination detection tools 2025
2. Lakera - Guide to hallucinations in LLMs
3. AWS - Reducing hallucinations with Amazon Bedrock
4. RAGFlow - RAG review 2025: From RAG to Context Engineering
5. Chain-of-Verification research (emergentmind.com)
6. Semantic Energy paper (arXiv 2508.14496)
7. Token probability vs expressed confidence (JMIR 2025)
8. RAGAS evaluation framework
9. MedHal dataset for medical hallucination detection
10. Future AGI - LLM evaluation frameworks

---

## Changelog

- **2026-01-25**: Initial research compilation from Perplexity deep research
