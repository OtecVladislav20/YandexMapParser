from .base import BaseParser

class GoogleParser(BaseParser):
    def parse(self, url: str) -> dict:
        return {"source": "google", "url": url}
