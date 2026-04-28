import json
import anthropic
from config import MODEL, MAX_TOKENS, NEXUS_NAME
from prompts import NEXUS_BASE_PROMPT
from tools import NEXUS_TOOLS
from .router import ToolRouter


class NexusAgent:
    """
    Main NEXUS orchestrator. Accepts a user request, uses Claude tool_use to route
    to the right specialist module, and returns the final response.
    """

    def __init__(self, client: anthropic.Anthropic):
        self.client = client
        self.router = ToolRouter(client)
        self.system_prompt = NEXUS_BASE_PROMPT

    def run(self, user_request: str) -> str:
        messages = [{"role": "user", "content": user_request}]

        while True:
            response = self.client.messages.create(
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
                tools=NEXUS_TOOLS,
                messages=messages,
            )

            if response.stop_reason == "end_turn":
                for block in response.content:
                    if hasattr(block, "text"):
                        return block.text
                return ""

            if response.stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": response.content})

                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = self.router.dispatch(block.name, block.input)
                        tool_results.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": result,
                            }
                        )

                messages.append({"role": "user", "content": tool_results})
                continue

            break

        return f"{NEXUS_NAME} encountered an unexpected state."
