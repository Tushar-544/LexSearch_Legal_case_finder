import logging
from transformers import pipeline

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

try:
    log.info("Attempting to load google/flan-t5-small...")
    _llm = pipeline(
        "text2text-generation",
        model="google/flan-t5-small",
        max_new_tokens=512,
        do_sample=False,
    )
    log.info("SUCCESS: Loaded!")
    out = _llm("Translate to French: Hello how are you?")
    log.info(f"Test output: {out}")
except Exception as e:
    log.error(f"FAILURE: {e}")
    import traceback
    traceback.print_exc()
