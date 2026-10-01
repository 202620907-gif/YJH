import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from analyzers.mock_analyzer import MockAnalyzer
from analyzers.openai_analyzer import OpenAIAnalyzer
from schemas import AnalysisResult

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024

PROCESSES = ["TIG", "SMAW", "GMAW"]

app = FastAPI(title="용접 피드백 코치 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_analyzer():
    provider = os.getenv("ANALYZER_PROVIDER", "mock").lower()
    if provider == "openai":
        try:
            return OpenAIAnalyzer()
        except Exception as exc:
            print(f"[경고] OpenAI 분석기 초기화 실패({exc}) → Mock 분석기로 대체합니다.")
    return MockAnalyzer()


@app.get("/api/health")
async def health():
    analyzer = get_analyzer()
    return {"status": "ok", "provider": analyzer.name}


@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze(
    file: UploadFile = File(...),
    process: str = Form("TIG"),
    material: str = Form(""),
    position: str = Form(""),
    memo: str = Form(""),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="JPG, PNG, WEBP 이미지 파일만 업로드할 수 있습니다.")

    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="파일이 너무 큽니다. 10MB 이하 이미지를 사용하세요.")
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    process = process.upper() if process.upper() in PROCESSES else "TIG"

    analyzer = get_analyzer()
    try:
        result = analyzer.analyze(image_bytes, process, material, position, memo)
    except Exception as exc:
        print(f"[경고] {analyzer.name} 분석 실패({exc}) → Mock 분석기로 대체합니다.")
        result = MockAnalyzer().analyze(image_bytes, process, material, position, memo)

    return result


app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
