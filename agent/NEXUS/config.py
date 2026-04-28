import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = os.getenv("NEXUS_MODEL", "claude-opus-4-7")
MAX_TOKENS = int(os.getenv("NEXUS_MAX_TOKENS", "16000"))

NEXUS_VERSION = "1.0.0"
NEXUS_NAME = "NEXUS"
NEXUS_FULL_NAME = "Next-gen Engineering eXpert Unified System"
