# NEXUS — Next-gen Engineering eXpert Unified System

> **Version:** 1.0.0  
> **Model:** Claude Opus 4.7 (`claude-opus-4-7`)  
> **Runtime:** Python 3.10+

NEXUS is an AI engineering agent powered by Anthropic's Claude. It acts as a senior software engineer across nine specialisations — from system architecture and full-stack development to code review, optimisation, linting, cloud infrastructure, database design, and test generation — all accessible through a single conversational interface.

---

## Table of Contents

1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Specialist Modules](#specialist-modules)
5. [How It Works](#how-it-works)
6. [Installation](#installation)
7. [Configuration](#configuration)
8. [Running NEXUS](#running-nexus)
9. [Usage Examples](#usage-examples)
10. [Technical Design Decisions](#technical-design-decisions)
11. [Dependencies](#dependencies)
12. [Environment Variables](#environment-variables)

---

## Features

| Capability | Description |
|---|---|
| **System Architecture** | Designs microservices, event-driven systems, API gateways, caching layers, and data flows |
| **Frontend Engineering** | Builds React, Vue, Angular, and vanilla JS/CSS/HTML components with accessibility and performance in mind |
| **Backend Engineering** | Creates REST/GraphQL APIs, authentication systems, middleware, and service layers in Python, Node.js, Java, or Go |
| **Database Design** | Designs schemas, writes optimised queries, configures ORMs, and manages migrations for SQL and NoSQL databases |
| **Cloud & DevOps** | Writes Terraform, Kubernetes manifests, CI/CD pipelines, and Docker configurations for AWS, GCP, and Azure |
| **Code Review** | Provides structured feedback with severity ratings (Critical / Major / Minor / Suggestion) covering correctness, security, and maintainability |
| **Code Optimisation** | Improves time/space complexity, eliminates redundant computation, and delivers before/after comparisons |
| **Linting & Semantic Analysis** | Detects syntax, semantic, logical, and style errors with line-level diagnostics and auto-fix suggestions |
| **Test Generation** | Produces complete test suites (unit, integration, E2E) using pytest, Jest, JUnit, Playwright, and more |

---

## Architecture Overview

```
User Input
    │
    ▼
┌─────────────────────────────────────┐
│           NexusAgent                │
│  (core/agent.py)                    │
│                                     │
│  1. Sends request to Claude         │
│     with 9 tool definitions         │
│  2. Claude picks the right tool     │
│  3. ToolRouter dispatches call      │
│  4. Specialist module responds      │
│  5. Claude synthesises final answer │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│           ToolRouter                │
│  (core/router.py)                   │
├─────────────┬───────────────────────┤
│  Tool Name  │  Specialist Class     │
├─────────────┼───────────────────────┤
│ design_arch │ SystemArchitect       │
│ frontend    │ FrontendEngineer      │
│ backend     │ BackendEngineer       │
│ database    │ DatabaseEngineer      │
│ cloud       │ CloudEngineer         │
│ review_code │ CodeReviewer          │
│ optimize    │ CodeOptimizer         │
│ lint_code   │ Linter                │
│ gen_tests   │ Tester                │
└─────────────┴───────────────────────┘
    │
    ▼
Each Specialist:
  - Has its own deep system prompt
  - Uses adaptive thinking (claude-opus-4-7)
  - Caches system prompt (prompt caching)
  - Streams response via client.messages.stream()
```

The agent uses Claude's **tool_use** capability as an intelligent router. Claude reads the user's natural-language request, selects the most appropriate specialist tool, and passes structured parameters to it. The specialist executes with its domain-specific system prompt, and Claude synthesises the result into a final response.

---

## Project Structure

```
agent/NEXUS/
│
├── main.py                         # Interactive CLI entry point
├── config.py                       # Environment variable loader
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment variable template
├── README.md                       # This file
│
├── core/                           # Orchestration layer
│   ├── __init__.py
│   ├── agent.py                    # NexusAgent — agentic tool-use loop
│   └── router.py                   # ToolRouter — dispatches to specialists
│
├── modules/                        # Specialist implementations
│   ├── __init__.py
│   ├── architect/
│   │   └── system_architect.py     # SystemArchitect
│   ├── frontend/
│   │   └── frontend_engineer.py    # FrontendEngineer
│   ├── backend/
│   │   └── backend_engineer.py     # BackendEngineer
│   ├── database/
│   │   └── db_engineer.py          # DatabaseEngineer
│   ├── cloud/
│   │   └── cloud_engineer.py       # CloudEngineer
│   ├── reviewer/
│   │   └── code_reviewer.py        # CodeReviewer
│   ├── optimizer/
│   │   └── code_optimizer.py       # CodeOptimizer
│   ├── linter/
│   │   └── linter.py               # Linter
│   └── tester/
│       └── tester.py               # Tester
│
├── tools/
│   └── engineering_tools.py        # 9 Claude tool definitions (JSON schemas)
│
├── prompts/
│   └── system_prompts.py           # 10 specialist system prompts
│
└── utils/
    ├── logger.py                   # Rich-based logger
    └── helpers.py                  # Utility functions
```

---

## Specialist Modules

### 1. SystemArchitect (`modules/architect/`)
**Entry:** `SystemArchitect.run(task, context, output_format)`

Designs system architectures covering microservices vs. monolith tradeoffs, distributed systems (CAP theorem, consensus), API design (REST/GraphQL/gRPC), messaging (Kafka/RabbitMQ/SQS), caching strategies, and load balancing. Delivers architecture diagrams (ASCII/text), component definitions, data-flow descriptions, and technology stack recommendations with rationale.

---

### 2. FrontendEngineer (`modules/frontend/`)
**Entry:** `FrontendEngineer.run(task, framework, code_snippet)`

Builds modern UIs with React (hooks, Redux/Zustand, React Query), Vue 3, and Angular. Covers TypeScript, Tailwind CSS, accessibility (WCAG 2.1/ARIA), performance optimisation (code splitting, memoisation), and testing with Jest, React Testing Library, Cypress, and Playwright.

---

### 3. BackendEngineer (`modules/backend/`)
**Entry:** `BackendEngineer.run(task, language, code_snippet)`

Implements server-side systems in Python (FastAPI, Django, Flask), Node.js (Express, NestJS), Java (Spring Boot), and Go. Covers REST API design, OpenAPI documentation, JWT/OAuth2 authentication, input validation, rate limiting, and clean architecture patterns.

---

### 4. DatabaseEngineer (`modules/database/`)
**Entry:** `DatabaseEngineer.run(task, db_type, schema_or_query)`

Handles relational databases (PostgreSQL, MySQL, SQLite) and NoSQL (MongoDB, Redis, Cassandra, DynamoDB). Delivers schema designs, migration scripts (Alembic/Flyway), optimised queries with EXPLAIN ANALYZE analysis, ORM model definitions, and connection pool configurations.

---

### 5. CloudEngineer (`modules/cloud/`)
**Entry:** `CloudEngineer.run(task, provider, existing_config)`

Covers AWS (EC2, EKS, Lambda, RDS, S3, IAM, VPC), GCP (GKE, Cloud Run, BigQuery), and Azure (AKS, App Service, Cosmos DB). Writes Terraform/CDK/Pulumi IaC, Kubernetes manifests, Helm charts, CI/CD pipelines (GitHub Actions, ArgoCD), and monitoring configurations.

---

### 6. CodeReviewer (`modules/reviewer/`)
**Entry:** `CodeReviewer.run(code, language, context, focus_areas)`

Performs structured code reviews using a checklist covering correctness, OWASP Top 10 security, performance (N+1, memory leaks), maintainability (SOLID/DRY), error handling, test coverage, and documentation. Output is categorised by severity: **Critical → Major → Minor → Suggestion**.

---

### 7. CodeOptimizer (`modules/optimizer/`)
**Entry:** `CodeOptimizer.run(code, language, optimization_goals, constraints)`

Analyses code across time complexity (Big-O), space complexity, I/O patterns, and language-specific idioms. Delivers refactored code alongside before/after comparison, complexity analysis, and benchmark guidance.

---

### 8. Linter (`modules/linter/`)
**Entry:** `Linter.run(code, language, lint_rules, severity_level)`

Detects syntax errors, semantic issues (type mismatches, undefined variables, scope), logical errors (off-by-one, wrong operator precedence), style violations (PEP 8, ESLint), security linting (hardcoded secrets, unsafe `eval()`), unused imports, and deprecated API usage. Returns a diagnostic list with file location, error code, and fix suggestion.

---

### 9. Tester (`modules/tester/`)
**Entry:** `Tester.run(code, language, test_framework, test_types)`

Generates complete test files using pytest, Jest/Vitest, JUnit, or Go test. Produces unit tests, integration tests, and E2E tests (Playwright/Cypress), including mocks/stubs/fakes, parametrised cases, setup/teardown fixtures, coverage analysis, and CI integration snippets.

---

## How It Works

### Agentic Tool-Use Loop (`core/agent.py`)

```
1. NexusAgent.run(user_request)
      │
      ▼
2. client.messages.create(tools=NEXUS_TOOLS, ...)
      │
      ├── stop_reason == "end_turn"   → return Claude's text response
      │
      └── stop_reason == "tool_use"  → extract tool_use blocks
                │
                ▼
3. ToolRouter.dispatch(tool_name, tool_input)
      │
      └── calls the matching specialist's .run() method
                │
                ▼
4. Append tool_result to messages
      │
      ▼
5. Loop back to step 2 — Claude synthesises the result
```

### Prompt Caching

Every specialist system prompt is wrapped with `"cache_control": {"type": "ephemeral"}`. This instructs Anthropic's infrastructure to cache the prompt prefix, significantly reducing latency and token cost for repeated invocations of the same specialist.

### Adaptive Thinking

All API calls use `thinking={"type": "adaptive"}`. Claude Opus 4.7 dynamically decides whether and how deeply to reason before responding — optimal for complex engineering tasks that benefit from multi-step planning without paying thinking costs on simple lookups.

---

## Installation

### Prerequisites

- Python 3.10 or higher
- An Anthropic API key ([get one here](https://console.anthropic.com))

### Steps

```bash
# 1. Navigate to the agent directory
cd agent/NEXUS

# 2. Create and activate a virtual environment (recommended)
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
```

Open `.env` and fill in your API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Configuration

All configuration is loaded from environment variables (`.env` file or shell).

### `.env.example`

```env
# Required — your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional — override the model (default: claude-opus-4-7)
NEXUS_MODEL=claude-opus-4-7

# Optional — override max output tokens (default: 16000)
NEXUS_MAX_TOKENS=16000
```

### `config.py` defaults

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(required)* | Anthropic API key |
| `NEXUS_MODEL` | `claude-opus-4-7` | Claude model to use |
| `NEXUS_MAX_TOKENS` | `16000` | Max tokens per response |

---

## Running NEXUS

```bash
# From agent/NEXUS/
python main.py
```

You will see the NEXUS banner and an interactive prompt:

```
╭──────────────────────────────────────────────────────╮
│ NEXUS v1.0.0                                         │
│ Next-gen Engineering eXpert Unified System           │
│                                                      │
│ Your AI engineering partner — architecture, code,    │
│ cloud, DB, review, tests, and more.                  │
│ Type help to see capabilities  •  Type exit to quit  │
╰──────────────────────────────────────────────────────╯

You>
```

### CLI Commands

| Command | Action |
|---|---|
| `help` | Show the capability table |
| `exit` / `quit` / `q` | Exit NEXUS |
| *(any other text)* | Send to NEXUS as an engineering request |

---

## Usage Examples

### System Architecture

```
You> Design a microservices architecture for a real-time ride-sharing platform
     that needs to handle 100,000 concurrent users.
```

```
You> I have a monolithic Django app. What's the best strategy to break it into
     microservices without downtime?
```

---

### Frontend Engineering

```
You> Build a React dashboard component that displays live metrics using WebSockets,
     with a dark/light theme toggle and skeleton loaders.
```

```
You> Fix the accessibility issues in this navbar — make it keyboard navigable
     and screen-reader friendly.

     <paste your code>
```

---

### Backend Engineering

```
You> Create a FastAPI authentication service with JWT access tokens,
     refresh tokens, and rate limiting (100 requests/minute per IP).
```

```
You> Implement a Node.js middleware chain for request validation,
     authentication, and structured error responses.
```

---

### Database Design

```
You> Design a PostgreSQL schema for a multi-tenant SaaS application.
     Each tenant has users, projects, and audit logs. Include indexes.
```

```
You> This query is slow on 5M rows — optimise it:

     SELECT * FROM orders JOIN customers ON orders.customer_id = customers.id
     WHERE orders.created_at > '2024-01-01' AND customers.country = 'US';
```

---

### Cloud & DevOps

```
You> Write a Terraform module that provisions an AWS EKS cluster with
     auto-scaling node groups, ALB ingress, and IAM roles.
```

```
You> Create a GitHub Actions CI/CD pipeline for a Python service that runs
     tests, builds a Docker image, and deploys to AWS ECS on merge to main.
```

---

### Code Review

```
You> Review this Python authentication function for security vulnerabilities:

     def login(username, password):
         query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
         user = db.execute(query).fetchone()
         return user
```

---

### Code Optimisation

```
You> Optimise this function — it's too slow on large lists:

     def find_duplicates(items):
         duplicates = []
         for i in range(len(items)):
             for j in range(i + 1, len(items)):
                 if items[i] == items[j] and items[i] not in duplicates:
                     duplicates.append(items[i])
         return duplicates
```

---

### Linting & Semantic Analysis

```
You> Find all errors and style violations in this JavaScript module:

     <paste your code>
```

---

### Test Generation

```
You> Generate a complete pytest test suite for this FastAPI user registration endpoint,
     including happy path, validation errors, duplicate email handling, and DB failure.
```

---

## Technical Design Decisions

### Why tool_use routing instead of a single prompt?

Routing via Claude's tool_use gives each specialist a focused, expert-level system prompt rather than one giant catch-all prompt. A system architect and a linter require fundamentally different reasoning modes and output formats — keeping them separate produces higher-quality, more consistent results.

### Why adaptive thinking?

Claude Opus 4.7's adaptive thinking (`thinking: {"type": "adaptive"}`) lets the model decide when extended chain-of-thought is worth the cost. For a simple linting request it stays fast; for a complex architecture design it reasons deeply. This is more cost-efficient than always enabling extended thinking.

### Why prompt caching on system prompts?

Each specialist's system prompt is hundreds of tokens and does not change between requests. Marking them with `cache_control: ephemeral` means Anthropic caches the encoded representation, reducing latency by ~80% and cost by ~90% on repeated calls to the same specialist.

### Why streaming?

All specialist modules use `client.messages.stream()`. Engineering responses can be long (full test suites, architecture documents, refactored code). Streaming prevents request timeouts and allows future extensions (e.g., printing results as they arrive) without changing the module interface.

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `anthropic` | ≥ 0.40.0 | Claude API SDK — core intelligence |
| `python-dotenv` | ≥ 1.0.0 | `.env` file loading |
| `rich` | ≥ 13.0.0 | Terminal formatting, Markdown rendering, spinners |
| `typer` | ≥ 0.12.0 | CLI argument parsing (available for extension) |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Your Anthropic API key |
| `NEXUS_MODEL` | No | `claude-opus-4-7` | Claude model ID |
| `NEXUS_MAX_TOKENS` | No | `16000` | Maximum tokens per response |

---

*NEXUS — built with the Anthropic Python SDK and Claude Opus 4.7*
