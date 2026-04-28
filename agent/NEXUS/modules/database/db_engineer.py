import anthropic
from config import MODEL, MAX_TOKENS
from prompts import DATABASE_PROMPT


class DatabaseEngineer:
    """Handles database design, queries, and connectivity tasks."""

    def __init__(self, client: anthropic.Anthropic):
        self.client = client
        self.system_prompt = DATABASE_PROMPT

    def run(self, task: str, db_type: str = "", schema_or_query: str = "") -> str:
        user_content = f"Task: {task}"
        if db_type:
            user_content += f"\n\nDatabase: {db_type}"
        if schema_or_query:
            user_content += f"\n\nExisting schema/query:\n```sql\n{schema_or_query}\n```"

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
