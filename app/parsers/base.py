class BaseParser:
    def parse(self, url: str) -> dict:
        raise NotImplementedError
