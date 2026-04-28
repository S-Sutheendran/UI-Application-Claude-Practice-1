import os
import sys
import anthropic
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.markdown import Markdown
from rich.rule import Rule
from rich import print as rprint

from config import NEXUS_NAME, NEXUS_FULL_NAME, NEXUS_VERSION
from core import NexusAgent

load_dotenv()

console = Console()

BANNER = f"""
[bold cyan]{NEXUS_NAME}[/bold cyan] [dim]v{NEXUS_VERSION}[/dim]
[italic]{NEXUS_FULL_NAME}[/italic]

Your AI engineering partner — architecture, code, cloud, DB, review, tests, and more.
Type [bold green]help[/bold green] to see capabilities  •  Type [bold red]exit[/bold red] to quit
"""

HELP_TEXT = """
## NEXUS Capabilities

| Domain               | Example request                                           |
|----------------------|-----------------------------------------------------------|
| System Architecture  | Design a microservices architecture for an e-commerce app |
| Frontend             | Build a React dashboard with dark mode toggle             |
| Backend              | Create a FastAPI REST API with JWT authentication         |
| Database             | Design a PostgreSQL schema for a SaaS multi-tenant app    |
| Cloud / DevOps       | Write a Terraform module for an AWS EKS cluster           |
| Code Review          | Review this Python function for security issues           |
| Code Optimization    | Optimize this SQL query for performance                   |
| Linting              | Find semantic errors in this JavaScript code              |
| Testing              | Generate pytest unit tests for this module                |

Just describe what you need in plain English and NEXUS will route to the right expert.
"""


def get_client() -> anthropic.Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        console.print("[bold red]Error:[/bold red] ANTHROPIC_API_KEY is not set.")
        console.print("Copy [cyan].env.example[/cyan] to [cyan].env[/cyan] and add your key.")
        sys.exit(1)
    return anthropic.Anthropic(api_key=api_key)


def main():
    console.print(Panel(BANNER, border_style="cyan", expand=False))

    client = get_client()
    agent = NexusAgent(client)

    while True:
        try:
            user_input = Prompt.ask("\n[bold green]You[/bold green]").strip()
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]Goodbye.[/dim]")
            break

        if not user_input:
            continue

        if user_input.lower() in {"exit", "quit", "q"}:
            console.print("[dim]Goodbye.[/dim]")
            break

        if user_input.lower() in {"help", "h", "?"}:
            console.print(Markdown(HELP_TEXT))
            continue

        console.print(Rule(f"[cyan]{NEXUS_NAME}[/cyan]", style="cyan"))
        with console.status(f"[cyan]{NEXUS_NAME} is thinking...[/cyan]", spinner="dots"):
            try:
                response = agent.run(user_input)
            except anthropic.APIError as e:
                console.print(f"[bold red]API Error:[/bold red] {e}")
                continue
            except Exception as e:
                console.print(f"[bold red]Unexpected error:[/bold red] {e}")
                continue

        console.print(Markdown(response))
        console.print(Rule(style="dim"))


if __name__ == "__main__":
    main()
