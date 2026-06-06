"""
Embedding service dùng Flag Embedding (BGE-M3).
Hỗ trợ đa ngôn ngữ (tiếng Việt).

Local:  uvicorn server:app --host 0.0.0.0 --port 5004
Docker: port 7860 (Hugging Face Spaces)
"""
import os
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

MODEL_NAME = os.environ.get("BGE_MODEL", "BAAI/bge-m3")
MAX_LENGTH = int(os.environ.get("BGE_MAX_LENGTH", "512"))
USE_FP16 = os.environ.get("BGE_USE_FP16", "1") == "1"
EMBEDDING_API_KEY = os.environ.get("EMBEDDING_API_KEY", "").strip()
model = None


def load_model():
    global model
    if model is not None:
        return
    from FlagEmbedding import BGEM3FlagModel

    model = BGEM3FlagModel(MODEL_NAME, use_fp16=USE_FP16)


async def verify_api_key(
    authorization: Annotated[str | None, Header()] = None,
    x_embedding_token: Annotated[str | None, Header(alias="X-Embedding-Token")] = None,
) -> None:
    if not EMBEDDING_API_KEY:
        return
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif x_embedding_token:
        token = x_embedding_token.strip()
    if not token or token != EMBEDDING_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield


app = FastAPI(title="Galaxies Embedding", version="1.0.0", lifespan=lifespan)


class EmbedTextsRequest(BaseModel):
    texts: list[str]


class EmbedSingleRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]


class EmbedSingleResponse(BaseModel):
    embedding: list[float]


@app.get("/")
def root():
    return {
        "service": "galaxies-embedding",
        "model": MODEL_NAME,
        "health": "/health",
        "embed_one": "/embed_one",
    }


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "loaded": model is not None}


@app.post("/embed", response_model=EmbedResponse, dependencies=[Depends(verify_api_key)])
def embed_texts(body: EmbedTextsRequest):
    """Embed danh sách văn bản (passages hoặc queries). Trả về dense vectors chuẩn hóa."""
    if not body.texts:
        raise HTTPException(status_code=400, detail="texts must be non-empty")
    load_model()
    try:
        out = model.encode(body.texts, max_length=MAX_LENGTH)
        dense = out["dense_vecs"]
        embeddings = [dense[i].tolist() for i in range(len(dense))]
        return EmbedResponse(embeddings=embeddings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/embed_one", response_model=EmbedSingleResponse, dependencies=[Depends(verify_api_key)])
def embed_one(body: EmbedSingleRequest):
    """Embed một chuỗi (tiện cho query)."""
    load_model()
    try:
        out = model.encode([body.text], max_length=MAX_LENGTH)
        dense = out["dense_vecs"]
        return EmbedSingleResponse(embedding=dense[0].tolist())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "5004"))
    uvicorn.run(app, host="0.0.0.0", port=port)
