from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.parser import YandexMapsParser
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Yandex Maps Parser API",
    description="API для парсинга данных с Яндекс Карт",
    version="1.0.0"
)

class ParseRequest(BaseModel):
    url: str
    organization_id: str = None

class ParseResponse(BaseModel):
    success: bool
    data: dict
    error: str = None

parser = YandexMapsParser()

@app.get("/")
async def root():
    return {"message": "Yandex Maps Parser API"}

@app.post("/parse", response_model=ParseResponse)
async def parse_organization(request: ParseRequest):
    """
    Парсинг данных организации с Яндекс Карт
    """
    try:
        data = await asyncio.get_event_loop().run_in_executor(
            None, 
            parser.parse_organization, 
            # request.url or f"https://yandex.ru/maps/org/{request.organization_id}/reviews/" #https://yandex.ru/maps/org/1014186377/reviews/
            request.url or f"https://2gis.ru/spb/search/блитц%20тоннель/firm/5348552839380704/30.348079%2C59.880112?m=30.348041%2C59.880139%2F17.53" #https://yandex.ru/maps/org/1014186377/reviews/
        )
        
        return ParseResponse(success=True, data=data)
        
    except Exception as e:
        logger.error(f"Ошибка парсинга: {e}")
        return ParseResponse(success=False, data={}, error=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
