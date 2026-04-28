import anthropic
from config import MODEL, MAX_TOKENS
from prompts import OPTIMIZER_PROMPT


class CodeOptimizer:
    """Analyzes and optimizes code for performance, readability, and efficiency."""

    def __init__(self, client: anthropic.Anthropic):
        self.client = client
        self.system_prompt = OPTIMIZER_PROMPT

    def run(
        self,
        code: str,
        language: str = "",
        optimization_goals: str = "",
        constraints: str = "",
    ) -> str:
        user_content = f"Please optimize this code:"
        if language:
            user_content += f"\nLanguage: {language}"
        if optimization_goals:
            user_content += f"\nOptimization goals: {optimization_goals}"
        if constraints:
            user_content += f"\nConstraints: {constraints}"
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
