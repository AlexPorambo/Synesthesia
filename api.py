from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from semantic_mapping import interpret_concept
from pathlib import Path
from fastapi.responses import FileResponse

app = FastAPI()
@app.get("/")
def homepage():
    html_path = Path(__file__).with_name("synesthesia_v0.1.html")
    return FileResponse(html_path)

# Defines the JSON our endpoint expects.
class ConceptRequest(BaseModel):
    text: str


@app.post("/interpret")
def interpret(request: ConceptRequest):
    try:
        return interpret_concept(request.text)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        ) from error