from sentence_transformers import SentenceTransformer
import json 
from pathlib import Path

# Load a pretrained model that converts text into numerical vectors.
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

dataset_path = Path(__file__).with_name("concepts.json")
with dataset_path.open(encoding="utf-8") as file:
    dataset = json.load(file)

concepts = [example["concept"] for example in dataset]

# Encode the reference concepts once.
concept_vectors = model.encode(
    concepts,
    normalize_embeddings=True
)

def interpret_concept(text):
    query = text.strip()

    if not query:
        raise ValueError("Please enter a concept.")

    query_vector = model.encode(
        query,
        normalize_embeddings=True
    )

    scores = concept_vectors @ query_vector
    best_index = int(scores.argmax())

    return {
        "settings": dataset[best_index],
        "similarity": float(scores[best_index])
    }


# Only ask for terminal input when running this file directly.
if __name__ == "__main__":
    text = input("Enter a concept: ")
    result = interpret_concept(text)
    print(json.dumps(result, indent=2))