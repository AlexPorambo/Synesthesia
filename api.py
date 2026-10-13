"""Run: python -m uvicorn api:app --host 127.0.0.1 --port 8000"""
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from semantic_mapping import dataset, visual_settings, interpret_concept

ROOT = Path(__file__).resolve().parent
app = FastAPI(title="Synesthesia")

class ConceptRequest(BaseModel):
    text: str = Field(min_length=1, max_length=300)

@app.get("/")
def homepage():
    return FileResponse(ROOT / "index.html")

# Explicit asset routes avoid exposing other project files.
@app.get("/engine.js")
def engine():
    return FileResponse(ROOT / "engine.js", media_type="application/javascript")

@app.get("/studio.js")
def studio():
    return FileResponse(ROOT / "studio.js", media_type="application/javascript")

@app.get("/studio.css")
def styles():
    return FileResponse(ROOT / "studio.css", media_type="text/css")

@app.get("/concepts")
def examples():
    return [visual_settings(example) for example in dataset]

@app.post("/interpret")
def interpret(request: ConceptRequest):
    try:
        return interpret_concept(request.text)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
