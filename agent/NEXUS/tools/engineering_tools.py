"""Tool definitions that NEXUS uses to route tasks to the right specialist module."""

NEXUS_TOOLS = [
    {
        "name": "design_architecture",
        "description": (
            "Design system architecture, including microservices, API design, "
            "data flow diagrams, technology stack selection, and scalability planning. "
            "Use when the user asks about system design, architecture patterns, "
            "component structure, or technology choices."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "description": "The architecture or system design task to perform",
                },
                "context": {
                    "type": "string",
                    "description": "Additional context: scale requirements, existing stack, constraints",
                },
                "output_format": {
                    "type": "string",
                    "enum": ["diagram", "document", "checklist", "code"],
                    "description": "Preferred output format",
                },
            },
            "required": ["task"],
        },
    },
    {
        "name": "handle_frontend",
        "description": (
            "Handle frontend engineering tasks: UI components, state management, "
            "styling, performance optimization, and accessibility. "
            "Use for React, Vue, Angular, HTML/CSS/JS tasks."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "description": "The frontend task to implement",
                },
                "framework": {
                    "type": "string",
                    "description": "Frontend framework (React, Vue, Angular, vanilla)",
                },
                "code_snippet": {
                    "type": "string",
                    "description": "Existing code to modify or reference",
                },
            },
            "required": ["task"],
        },
    },
    {
        "name": "handle_backend",
        "description": (
            "Handle backend engineering tasks: API design, server logic, authentication, "
            "middleware, and service architecture. "
            "Use for Python, Node.js, Java, Go backend tasks."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "description": "The backend task to implement",
                },
                "language": {
                    "type": "string",
                    "description": "Programming language and framework",
                },
                "code_snippet": {
                    "type": "string",
                    "description": "Existing code to modify or reference",
                },
            },
            "required": ["task"],
        },
    },
    {
        "name": "handle_database",
        "description": (
            "Handle database tasks: schema design, query writing, ORM configuration, "
            "index optimization, migrations, and connection setup. "
            "Use for SQL (PostgreSQL, MySQL), NoSQL (MongoDB, Redis, DynamoDB) tasks."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "description": "The database task to perform",
                },
                "db_type": {
                    "type": "string",
                    "description": "Database type (PostgreSQL, MySQL, MongoDB, Redis, etc.)",
                },
                "schema_or_query": {
                    "type": "string",
                    "description": "Existing schema, query, or model to work with",
                },
            },
            "required": ["task"],
        },
    },
    {
        "name": "handle_cloud",
        "description": (
            "Handle cloud infrastructure tasks: IaC, CI/CD pipelines, container orchestration, "
            "serverless functions, and cloud service configuration. "
            "Use for AWS, GCP, Azure, Terraform, Kubernetes, Docker tasks."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "description": "The cloud infrastructure task to perform",
                },
                "provider": {
                    "type": "string",
                    "description": "Cloud provider (AWS, GCP, Azure) or tool (Terraform, K8s)",
                },
                "existing_config": {
                    "type": "string",
                    "description": "Existing configuration or template to modify",
                },
            },
            "required": ["task"],
        },
    },
    {
        "name": "review_code",
        "description": (
            "Perform a thorough code review: identify bugs, security vulnerabilities, "
            "performance issues, anti-patterns, and improvement opportunities. "
            "Returns structured feedback with severity levels."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "The code to review",
                },
                "language": {
                    "type": "string",
                    "description": "Programming language of the code",
                },
                "context": {
                    "type": "string",
                    "description": "What the code is supposed to do",
                },
                "focus_areas": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific areas to focus on: security, performance, style, logic",
                },
            },
            "required": ["code"],
        },
    },
    {
        "name": "optimize_code",
        "description": (
            "Analyze and optimize code for performance, readability, and maintainability. "
            "Provides refactored code with before/after comparison and complexity analysis."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "The code to optimize",
                },
                "language": {
                    "type": "string",
                    "description": "Programming language",
                },
                "optimization_goal": {
                    "type": "string",
                    "enum": ["performance", "readability", "memory", "all"],
                    "description": "Primary optimization goal",
                },
            },
            "required": ["code"],
        },
    },
    {
        "name": "lint_code",
        "description": (
            "Detect syntax errors, semantic issues, style violations, unused variables, "
            "and logical errors in code. Returns error list with locations and fix suggestions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "The code to lint and analyze",
                },
                "language": {
                    "type": "string",
                    "description": "Programming language",
                },
                "strict": {
                    "type": "boolean",
                    "description": "Enable strict mode for additional checks",
                },
            },
            "required": ["code", "language"],
        },
    },
    {
        "name": "generate_tests",
        "description": (
            "Generate comprehensive test suites: unit tests, integration tests, "
            "and E2E tests with mocks, fixtures, and edge cases. "
            "Supports pytest, Jest, JUnit, and other major test frameworks."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "The code to generate tests for",
                },
                "test_type": {
                    "type": "string",
                    "enum": ["unit", "integration", "e2e", "all"],
                    "description": "Type of tests to generate",
                },
                "framework": {
                    "type": "string",
                    "description": "Test framework (pytest, jest, junit, etc.)",
                },
                "coverage_target": {
                    "type": "integer",
                    "description": "Target code coverage percentage (0-100)",
                },
            },
            "required": ["code"],
        },
    },
]
