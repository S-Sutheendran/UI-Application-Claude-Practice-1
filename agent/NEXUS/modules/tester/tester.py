import anthropic
from config import MODEL, MAX_TOKENS
from prompts import TESTER_PROMPT


class Tester:
    """Generates comprehensive test suites and testing strategies."""

    def __init__(self, client: anthropic.Anthropic):
        self.client = client
        self.system_prompt = TESTER_PROMPT

    def run(
        self,
        code: str,
        language: str = "",
        test_framework: str = "",
        test_types: str = "",
    ) -> str:
        user_content = f"Please generate tests for this code:"
        if language:
            user_content += f"\nLanguage: {language}"
        if test_framework:
            user_content += f"\nTest framework: {test_framework}"
        if test_types:
            user_content += f"\nTest types to include: {test_types}"
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
