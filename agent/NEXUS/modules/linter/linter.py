import anthropic
from config import MODEL, MAX_TOKENS
from prompts import LINTER_PROMPT


class Linter:
    """Detects linting issues, semantic errors, and code quality problems."""

    def __init__(self, client: anthropic.Anthropic):
        self.client = client
        self.system_prompt = LINTER_PROMPT

    def run(
        self,
        code: str,
        language: str = "",
        lint_rules: str = "",
        severity_level: str = "",
    ) -> str:
        user_content = f"Please lint and check this code for errors:"
        if language:
            user_content += f"\nLanguage: {language}"
        if lint_rules:
            user_content += f"\nLint rules/style guide: {lint_rules}"
        if severity_level:
            user_content += f"\nMinimum severity to report: {severity_level}"
        user_content += f"\n\n```{language}\n{code}\n```"

        with self.client.messages.stream(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            thinking={"type": "adaptive"},
            system=[
                {
                    "type": "text",
                    "text": self.system_prompt,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_content}],
        ) as stream:
            return stream.get_final_message().content[-1].text
