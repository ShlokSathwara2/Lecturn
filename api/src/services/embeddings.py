from fastembed import TextEmbedding

_model: TextEmbedding | None = None

def get_model() -> TextEmbedding:
    global _model
    if _model is None:
        _model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")
    return _model

def generate_embedding(text: str) -> list[float]:
    model = get_model()
    emb = list(model.embed([text]))[0]
    return emb.tolist()
