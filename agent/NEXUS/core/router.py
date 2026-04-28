import anthropic
from modules import (
    SystemArchitect,
    FrontendEngineer,
    BackendEngineer,
    DatabaseEngineer,
    CloudEngineer,
    CodeReviewer,
    CodeOptimizer,
    Linter,
    Tester,
)


class ToolRouter:
    """Maps tool names to specialist module instances and dispatches calls."""

    def __init__(self, client: anthropic.Anthropic):
        self._specialists = {
            "design_architecture": SystemArchitect(client),
            "handle_frontend": FrontendEngineer(client),
            "handle_backend": BackendEngineer(client),
            "handle_database": DatabaseEngineer(client),
            "handle_cloud": CloudEngineer(client),
            "review_code": CodeReviewer(client),
            "optimize_code": CodeOptimizer(client),
            "lint_code": Linter(client),
            "generate_tests": Tester(client),
        }

    def dispatch(self, tool_name: str, tool_input: dict) -> str:
        specialist = self._specialists.get(tool_name)
        if specialist is None:
            return f"Unknown tool: {tool_name}"

        if tool_name == "design_architecture":
            return specialist.run(
                task=tool_input["task"],
                context=tool_input.get("context", ""),
                output_format=tool_input.get("output_format", ""),
            )
        elif tool_name == "handle_frontend":
            return specialist.run(
                task=tool_input["task"],
                framework=tool_input.get("framework", ""),
                code_snippet=tool_input.get("code_snippet", ""),
            )
        elif tool_name == "handle_backend":
            return specialist.run(
                task=tool_input["task"],
                language=tool_input.get("language", ""),
                code_snippet=tool_input.get("code_snippet", ""),
            )
        elif tool_name == "handle_database":
            return specialist.run(
                task=tool_input["task"],
                db_type=tool_input.get("db_type", ""),
                schema_or_query=tool_input.get("schema_or_query", ""),
            )
        elif tool_name == "handle_cloud":
            return specialist.run(
                task=tool_input["task"],
                provider=tool_input.get("provider", ""),
                existing_config=tool_input.get("existing_config", ""),
            )
        elif tool_name == "review_code":
            return specialist.run(
                code=tool_input["code"],
                language=tool_input.get("language", ""),
                context=tool_input.get("context", ""),
                focus_areas=tool_input.get("focus_areas"),
            )
        elif tool_name == "optimize_code":
            return specialist.run(
                code=tool_input["code"],
                language=tool_input.get("language", ""),
                optimization_goals=tool_input.get("optimization_goal", ""),
            )
        elif tool_name == "lint_code":
            strict = tool_input.get("strict", False)
            return specialist.run(
                code=tool_input["code"],
                language=tool_input.get("language", ""),
                lint_rules="strict" if strict else "",
            )
        elif tool_name == "generate_tests":
            return specialist.run(
                code=tool_input["code"],
                language="",
                test_framework=tool_input.get("framework", ""),
                test_types=tool_input.get("test_type", ""),
            )

        return f"Dispatch error for tool: {tool_name}"
