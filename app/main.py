from fastapi import FastAPI
from app.models import ParseRequest, ParseResponse
from app.utils.executor import run_in_thread
from app.parsers.yandex import YandexMapsParser
from app.parsers.gis import GisParser
from app.parsers.google import GoogleParser


yandex = YandexMapsParser()
gis = GisParser()
google = GoogleParser()

app = FastAPI(
    title="Company Parser API",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"message": "Parser API running!"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/parse/yandex", response_model=ParseResponse)
async def parse_yandex(req: ParseRequest):
    try:
        data = await run_in_thread(yandex.parse, req.url)
        return ParseResponse(success=True, data=data)
    except Exception as e:
        return ParseResponse(success=False, error=str(e))
    

@app.post("/parse/2gis", response_model=ParseResponse)
async def parse_gis(req: ParseRequest):
    try:
        data = await run_in_thread(gis.parse, req.url)
        return ParseResponse(success=True, data=data)
    except Exception as e:
        return ParseResponse(success=False, error=str(e))


@app.post("/parse/google", response_model=ParseResponse)
async def parse_google(req: ParseRequest):
    try:
        data = await run_in_thread(google.parse, req.url)
        return ParseResponse(success=True, data=data)
    except Exception as e:
        return ParseResponse(success=False, error=str(e))
