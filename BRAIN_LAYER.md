# XPEX Brain Layer Architecture

## Overview

The XPEX Brain Layer is the strategic orchestration layer that sits above the frozen Core. It provides intelligent decision-making capabilities without modifying the execution engine.

```
┌─────────────────────────────────────────────────────────┐
│                    XPEX SYSTEMS                          │
│           "Core Executes. Brain Decides."                │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐ │
│  │               BRAIN LAYER (v2.0.0)                  │ │
│  │  • Strategic Orchestration                           │ │
│  │  • Agent Selection & Routing                         │ │
│  │  • Risk Assessment                                   │ │
│  │  • Decision Audit                                    │ │
│  └─────────────────────────────────────────────────────┘ │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              AGENT LAYER                            │ │
│  │  • agent-validate     • agent-validate-ai           │ │
│  │  • agent-health       • (extensible)                │ │
│  └─────────────────────────────────────────────────────┘ │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              CORE LAYER (FROZEN)                    │ │
│  │  • Supabase Auth      • Stripe Billing              │ │
│  │  • PostgreSQL         • Edge Functions              │ │
│  │  • Usage Analytics    • Credits Engine              │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Core Principles

1. **Brain Never Executes Transactions** - All execution happens in the Core
2. **Brain Never Modifies Core State** - Read-only access to Core data
3. **Brain Never Accesses Raw Billing Data** - Metadata only
4. **All Decisions Are Auditable** - Complete decision audit trail
5. **Core Logic Is Immutable** - No refactoring required for Brain evolution

## Database Schema

### brain_decisions
Immutable audit log of all orchestration decisions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who triggered the decision |
| decision_type | TEXT | Type of decision (e.g., "agent_routing") |
| inputs | JSONB | Input data for the decision |
| decision | JSONB | The decision made |
| confidence_score | DECIMAL | Confidence level (0-1) |
| execution_result | JSONB | Result after execution |
| latency_ms | INTEGER | Decision latency |
| risk_assessment | JSONB | Risk factors identified |
| agent_selected | TEXT | Agent chosen for execution |
| created_at | TIMESTAMP | When decision was made |

### agent_registry
Registry of all available agents.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Unique agent name |
| description | TEXT | Human-readable description |
| endpoint | TEXT | API endpoint path |
| status | TEXT | active, inactive, degraded, maintenance |
| capabilities | TEXT[] | List of capabilities |
| performance_score | DECIMAL | Historical performance (0-1) |
| avg_latency_ms | INTEGER | Average response time |
| cost_per_call | DECIMAL | Cost in credits |
| success_rate | DECIMAL | Success rate (0-1) |
| current_load | INTEGER | Current request load |
| max_load | INTEGER | Maximum capacity |

### brain_config
Configuration for Brain behavior.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| config_key | TEXT | Configuration key |
| config_value | JSONB | Configuration value |
| description | TEXT | What this config does |

## Edge Functions

### POST /brain-orchestrate
Main orchestration endpoint for intelligent agent routing.

**Request:**
```json
{
  "task_type": "email_validation",
  "payload": {
    "email": "user@example.com"
  },
  "priority": "high",
  "user_context": {}
}
```

**Response:**
```json
{
  "success": true,
  "decision": {
    "agent": "agent-validate",
    "endpoint": "/agent-validate",
    "confidence": 0.95,
    "estimated_latency_ms": 85,
    "fallbacks": ["agent-validate-ai", "agent-health"]
  },
  "risk": {
    "level": "low",
    "factors": []
  },
  "meta": {
    "decision_latency_ms": 12,
    "routing_factors": {
      "performance": 0.98,
      "availability": 0.85,
      "latency": 0.92,
      "cost": 0.90
    }
  }
}
```

### GET /brain-health
Health check for the Brain layer.

**Response:**
```json
{
  "status": "healthy",
  "layer": "XPEX_BRAIN",
  "version": "2.0.0",
  "agents": {
    "total": 3,
    "active": 3,
    "degraded": 0,
    "inactive": 0
  },
  "decisions": {
    "last_24h": 1250,
    "avg_latency_ms": 15,
    "success_rate": 99
  },
  "config": {
    "loaded": true,
    "keys": ["routing_strategy", "fallback_enabled", "risk_thresholds"]
  }
}
```

### GET /brain-decision-log
Fetch decision audit logs (authenticated).

**Query Parameters:**
- `limit` - Number of records (default: 50)
- `offset` - Pagination offset
- `decision_type` - Filter by type
- `start_date` - Filter from date
- `end_date` - Filter to date

## Routing Algorithm

The Brain uses a weighted probability model for agent selection:

```
Score = Σ (weight[factor] × value[factor])
```

### Priority Weights

| Priority | Performance | Availability | Latency | Cost |
|----------|-------------|--------------|---------|------|
| Critical | 0.50 | 0.30 | 0.15 | 0.05 |
| High | 0.40 | 0.30 | 0.20 | 0.10 |
| Medium | 0.30 | 0.25 | 0.25 | 0.20 |
| Low | 0.20 | 0.20 | 0.20 | 0.40 |

## Risk Assessment

The Brain performs real-time risk assessment on each decision:

| Factor | Trigger | Risk Level |
|--------|---------|------------|
| high_agent_load | Load > 70% | medium |
| degraded_performance | Score < 0.9 | medium → high |
| limited_fallbacks | Fallbacks < 2 | elevated |

## Security Model

### Decision Audit
- All decisions are logged immutably
- 365-day retention
- Captured: timestamp, inputs, decision, confidence, result

### Isolation
- Brain → Core: READ_ONLY
- Brain → Billing: METADATA_ONLY
- Agent Execution: SANDBOXED

## Operational Targets

| Metric | Target |
|--------|--------|
| Decision Latency | <100ms P95 |
| Decision Accuracy | >99.5% |
| Error Rate | <0.01% |
| Scalability | 10X-100X |

## Evolution Path

1. **Phase 1**: Multi-Tenant Intelligence
2. **Phase 2**: Enterprise Custom Brains
3. **Phase 3**: Autonomous Strategic Optimization
4. **Phase 4**: Cross-Platform Orchestration

**Guiding Rule**: NO_CORE_REFACTOR_REQUIRED

---

*XPEX Systems - "Core Executes. Brain Decides. System Evolves."*
