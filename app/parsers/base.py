import os
from abc import ABC, abstractmethod
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


class BaseParser(ABC):
    def __init__(self, profile_id: str | None = None, profile_base: str | None = None):
        self.profile_id = profile_id
        self.profile_base = profile_base
        self.driver = None

    def init_driver(self):
        options = self.build_driver_options()
        remote = os.getenv("SELENIUM_REMOTE_URL")
        if remote:
            options.add_argument("--user-data-dir=/home/seluser/chrome-profile")
            self.driver = webdriver.Remote(command_executor=remote, options=options)
        else:
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

