import anthropic
from config import MODEL, MAX_TOKENS
from prompts import CLOUD_PROMPT


class CloudEngineer:
    """Handles cloud infrastructure and DevOps tasks."""

    def __init__(self, client: anthropic.Anthropic):
        self.client = client
        self.system_prompt = CLOUD_PROMPT

    def run(self, task: str, provider: str = "", existing_config: str = "") -> str:
        user_content = f"Task: {task}"
        if provider:
            user_content += f"\n\nCloud Provider/Tool: {provider}"
        if existing_config:
            user_content += f"\n\nExisting configuration:\n```\n{existing_config}\n```"

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
