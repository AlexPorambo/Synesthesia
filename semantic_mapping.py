"""Semantic retrieval of Alex's visual labels, not a trained visual regressor."""
import json
from pathlib import Path
from sentence_transformers import SentenceTransformer

DATASET_PATH = Path(__file__).with_name("concepts.json")
with DATASET_PATH.open(encoding="utf-8") as file:
    dataset = json.load(file)
if not dataset:
    raise ValueError("concepts.json must contain at least one example")

# These are artistic structure rules; the embedding model does not learn them.
STRUCTURES = {
    "ocean": "ribbons", "fire": "flames", "forest": "branches",
    "sunset": "ribbons", "storm": "lightning", "desert": "ribbons",
    "mist": "ribbons", "lava": "flames", "ice": "crystals",
    "lightning": "lightning", "volcano": "flames", "jungle": "branches",
    "glacier": "crystals", "planet": "orbits", "waterfall": "ribbons",
    "hurricane": "orbits", "whirlpool": "orbits", "basketball": "orbits",
    "music": "ribbons", "space": "orbits"
}

def visual_settings(example):
    return {
        **example,
        "structure": example.get("structure", STRUCTURES.get(example["concept"], "ribbons")),
        "saturation": example.get("saturation", 80),
        "glow": example.get("glow", 1)
    }

# Load once per server process and cache reference embeddings in memory.
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
concepts = [example["concept"] for example in dataset]
concept_vectors = model.encode(concepts, normalize_embeddings=True)

def interpret_concept(text):
    query = text.strip()
    if not query:
        raise ValueError("Please enter a concept.")
    if len(query) > 300:
        raise ValueError("Use at most 300 characters.")
    vector = model.encode(query, normalize_embeddings=True)
    scores = concept_vectors @ vector
    index = int(scores.argmax())
    return {"settings": visual_settings(dataset[index]), "similarity": float(scores[index])}

if __name__ == "__main__":
    result = interpret_concept(input("Enter a concept: "))
    print(json.dumps(result, indent=2))
