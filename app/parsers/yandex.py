from .base import BaseParser

class YandexMapsParser(BaseParser):
    def parse(self, url: str) -> dict:
        # тут парсинг selenium
        return {"source": "yandex", "url": url}
