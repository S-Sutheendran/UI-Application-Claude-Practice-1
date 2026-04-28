import anthropic
from config import MODEL, MAX_TOKENS
from prompts import FRONTEND_PROMPT


class FrontendEngineer:
    """Handles frontend development tasks."""

    def __init__(self, client: anthropic.Anthropic):
        self.client = client
        self.system_prompt = FRONTEND_PROMPT

    def run(self, task: str, framework: str = "", code_snippet: str = "") -> str:
        user_content = f"Task: {task}"
        if framework:
            user_content += f"\n\nFramework: {framework}"
        if code_snippet:
            user_content += f"\n\nExisting code:\n```\n{code_snippet}\n```"

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
