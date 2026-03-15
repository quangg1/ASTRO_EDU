"""
Embedding service dùng Flag Embedding (BGE-M3).
Hỗ trợ đa ngôn ngữ (tiếng Việt). Chạy: uvicorn server:app --host 0.0.0.0 --port 5004
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

MODEL_NAME = os.environ.get("BGE_MODEL", "BAAI/bge-m3")
MAX_LENGTH = int(os.environ.get("BGE_MAX_LENGTH", "512"))
model = None


def load_model():
    global model
    if model is not None:
        return
    from FlagEmbedding import BGEM3FlagModel
    model = BGEM3FlagModel(MODEL_NAME, use_fp16=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield
    # cleanup nếu cần


app = FastAPI(title="Galaxies Embedding", version="1.0.0", lifespan=lifespan)


class EmbedTextsRequest(BaseModel):
    texts: list[str]


class EmbedSingleRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]


class EmbedSingleResponse(BaseModel):
    embedding: list[float]


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/embed", response_model=EmbedResponse)
def embed_texts(body: EmbedTextsRequest):
    """Embed danh sách văn bản (passages hoặc queries). Trả về dense vectors chuẩn hóa."""
    if not body.texts:
        raise HTTPException(status_code=400, detail="texts must be non-empty")
    load_model()
    try:
        out = model.encode(body.texts, max_length=MAX_LENGTH)
        dense = out["dense_vecs"]
        # numpy -> list for JSON; đã normalize từ model
        embeddings = [dense[i].tolist() for i in range(len(dense))]
        return EmbedResponse(embeddings=embeddings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed_one", response_model=EmbedSingleResponse)
def embed_one(body: EmbedSingleRequest):
    """Embed một chuỗi (tiện cho query)."""
    load_model()
    try:
        out = model.encode([body.text], max_length=MAX_LENGTH)
        dense = out["dense_vecs"]
        return EmbedSingleResponse(embedding=dense[0].tolist())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5004)
