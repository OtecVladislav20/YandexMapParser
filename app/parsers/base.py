from abc import ABC, abstractmethod
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


class BaseParser(ABC):
    def __init__(self):
        self.driver = None

    def init_driver(self):
        options = self.build_driver_options()
        self.driver = webdriver.Chrome(options=options)
    
    @abstractmethod
    def build_driver_options(self) -> Options:
        pass
    
    def parse(self, url: str) -> dict:
        self.init_driver()
        self.driver.get(url)

        data = {
            "name": self.getName(),
            "rating": self.getRating(),
            "count_reviews": self.getCountReviews(),
            "reviews": self.getReviews(),
        }

        extra = self.extra_fields()
        if extra:
            data.update(extra)

        self.driver.quit()
        return data

    @abstractmethod
    def getName(self):
        pass

    @abstractmethod
    def getRating(self):
        pass

    @abstractmethod
    def getCountReviews(self):
        pass

    @abstractmethod
    def getReviews(self, limit: int = 10):
        pass

