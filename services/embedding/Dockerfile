# Hugging Face Spaces (CPU Basic, 16GB RAM) — BGE-M3 embedding API
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# HF Spaces: only /tmp is reliably writable — redirect model caches
ENV HF_HOME=/tmp/hf_cache \
    TRANSFORMERS_CACHE=/tmp/hf_cache/transformers \
    TORCH_HOME=/tmp/hf_cache/torch \
    XDG_CACHE_HOME=/tmp/hf_cache \
    NUMBA_CACHE_DIR=/tmp/numba_cache \
    MPLCONFIGDIR=/tmp/matplotlib_cache \
    BGE_USE_FP16=0 \
    PORT=7860

RUN mkdir -p /tmp/hf_cache && chmod -R 777 /tmp/hf_cache

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

EXPOSE 7860
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
