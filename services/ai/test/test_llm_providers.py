import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from llm_providers import (
    build_provider_chain,
    default_provider_order,
    should_fallback_to_next_provider,
)


class LlmProvidersTest(unittest.TestCase):
    def test_should_fallback_on_credits(self):
        self.assertTrue(should_fallback_to_next_provider(402, "insufficient credits"))
        self.assertTrue(should_fallback_to_next_provider(429, "rate limit"))
        self.assertTrue(should_fallback_to_next_provider(500, "error"))
        self.assertTrue(should_fallback_to_next_provider(401, "invalid api key"))

    def test_openrouter_then_lmstudio_order(self):
        prev = os.environ.copy()
        try:
            os.environ["LLM_PROVIDER_ORDER"] = "openrouter,lmstudio"
            os.environ["OPENROUTER_API_KEY"] = "sk-test"
            os.environ["OPENROUTER_MODEL"] = "openrouter/free"
            os.environ["LM_STUDIO_MODEL"] = "local-model"
            chain = build_provider_chain(False)
            self.assertEqual(len(chain), 2)
            self.assertEqual(chain[0].label, "OpenRouter")
            self.assertEqual(chain[1].label, "LM Studio")
        finally:
            os.environ.clear()
            os.environ.update(prev)

    def test_default_order_when_openrouter_key(self):
        prev = os.environ.copy()
        try:
            os.environ.pop("LLM_PROVIDER_ORDER", None)
            os.environ["OPENROUTER_API_KEY"] = "sk-test"
            order = default_provider_order()
            self.assertIn("openrouter", order)
            self.assertIn("lmstudio", order)
        finally:
            os.environ.clear()
            os.environ.update(prev)

    def test_multiple_openrouter_keys_in_chain(self):
        prev = os.environ.copy()
        try:
            os.environ["LLM_PROVIDER_ORDER"] = "openrouter"
            os.environ.pop("OPENROUTER_API_KEY", None)
            os.environ["OPENROUTER_API_KEYS"] = "sk-or-aaa,sk-or-bbb"
            os.environ["OPENROUTER_MODELS"] = "openrouter/free,anthropic/claude-3-haiku"
            chain = build_provider_chain(False)
            self.assertEqual(len(chain), 2)
            self.assertEqual(chain[0].label, "OpenRouter #1")
            self.assertEqual(chain[0].api_key, "sk-or-aaa")
            self.assertEqual(chain[0].model, "openrouter/free")
            self.assertEqual(chain[1].label, "OpenRouter #2")
            self.assertEqual(chain[1].api_key, "sk-or-bbb")
            self.assertEqual(chain[1].model, "anthropic/claude-3-haiku")
        finally:
            os.environ.clear()
            os.environ.update(prev)

    def test_single_key_plus_plural_keys_deduped(self):
        prev = os.environ.copy()
        try:
            os.environ["LLM_PROVIDER_ORDER"] = "openrouter"
            os.environ["OPENROUTER_API_KEY"] = "sk-or-first"
            os.environ["OPENROUTER_API_KEYS"] = "sk-or-first,sk-or-second"
            chain = build_provider_chain(False)
            self.assertEqual(len(chain), 2)
            self.assertEqual(chain[0].api_key, "sk-or-first")
            self.assertEqual(chain[1].api_key, "sk-or-second")
        finally:
            os.environ.clear()
            os.environ.update(prev)

    def test_multiple_groq_keys_with_default_model(self):
        prev = os.environ.copy()
        try:
            os.environ["LLM_PROVIDER_ORDER"] = "groq"
            os.environ["GROQ_API_KEYS"] = "gsk_a,gsk_b"
            os.environ["GROQ_MODEL"] = "llama-3.3-70b-versatile"
            chain = build_provider_chain(False)
            self.assertEqual(len(chain), 2)
            self.assertEqual(chain[0].model, "llama-3.3-70b-versatile")
            self.assertEqual(chain[1].model, "llama-3.3-70b-versatile")
        finally:
            os.environ.clear()
            os.environ.update(prev)

    def test_openrouter_then_groq_multi_key_chain(self):
        prev = os.environ.copy()
        try:
            os.environ["LLM_PROVIDER_ORDER"] = "openrouter,groq"
            os.environ["OPENROUTER_API_KEYS"] = "sk-or-1,sk-or-2"
            os.environ["GROQ_API_KEYS"] = "gsk-1"
            chain = build_provider_chain(False)
            self.assertEqual(len(chain), 3)
            self.assertEqual(chain[0].label, "OpenRouter #1")
            self.assertEqual(chain[1].label, "OpenRouter #2")
            self.assertEqual(chain[2].label, "Groq Cloud")
        finally:
            os.environ.clear()
            os.environ.update(prev)

    def test_default_order_with_plural_keys_only(self):
        prev = os.environ.copy()
        try:
            os.environ.pop("LLM_PROVIDER_ORDER", None)
            os.environ.pop("OPENROUTER_API_KEY", None)
            os.environ["OPENROUTER_API_KEYS"] = "sk-or-only"
            order = default_provider_order()
            self.assertIn("openrouter", order)
        finally:
            os.environ.clear()
            os.environ.update(prev)


if __name__ == "__main__":
    unittest.main()
