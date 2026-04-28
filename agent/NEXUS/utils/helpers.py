def format_code_block(code: str, language: str = "") -> str:
    return f"```{language}\n{code}\n```"


def truncate_text(text: str, max_length: int = 500) -> str:
    if len(text) <= max_length:
        return text
    return text[:max_length] + "..."
