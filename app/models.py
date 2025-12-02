from pydantic import BaseModel

class ParseRequest(BaseModel):
    url: str

class ParseResponse(BaseModel):
    success: bool
    data: dict | None = None
    error: str | None = None
