import anthropic
from config import MODEL, MAX_TOKENS
from prompts import ARCHITECT_PROMPT


class SystemArchitect:
    """Handles system architecture and design tasks."""

    def __init__(self, client: anthropic.Anthropic):
        self.client = client
        self.system_prompt = ARCHITECT_PROMPT

    def run(self, task: str, context: str = "", output_format: str = "document") -> str:
        user_content = f"Task: {task}"
        if context:
            user_content += f"\n\nContext: {context}"
        if output_format:
            user_content += f"\n\nPreferred output format: {output_format}"

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
