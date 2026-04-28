import anthropic
from typing import Optional
from config import MODEL, MAX_TOKENS
from prompts import REVIEWER_PROMPT


class CodeReviewer:
    """Performs thorough code reviews with structured feedback."""

    def __init__(self, client: anthropic.Anthropic):
        self.client = client
        self.system_prompt = REVIEWER_PROMPT

    def run(
        self,
        code: str,
        language: str = "",
        context: str = "",
        focus_areas: Optional[list] = None,
    ) -> str:
        user_content = f"Please review this code:"
        if language:
            user_content += f"\nLanguage: {language}"
        if context:
            user_content += f"\nContext: {context}"
        if focus_areas:
            user_content += f"\nFocus areas: {', '.join(focus_areas)}"
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
