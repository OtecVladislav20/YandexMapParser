from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import logging

logger = logging.getLogger(__name__)

class YandexMapsParser:
    def __init__(self):
        self.driver = None
        self.setup_driver()
    
    def setup_driver(self):
        options = Options()
        
        options.add_argument("--headless=new")
        
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
        options.add_experimental_option('useAutomationExtension', False)
        

        options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-plugins-discovery")
        options.add_argument("--disable-background-timer-throttling")
        options.add_argument("--disable-backgrounding-occluded-windows")
        options.add_argument("--disable-renderer-backgrounding")
        
        self.driver = webdriver.Chrome(options=options)
        
        stealth_scripts = [
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})",
            "Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]})",
            "Object.defineProperty(navigator, 'languages', {get: () => ['ru-RU', 'ru', 'en']})",
            "const originalQuery = window.navigator.permissions.query; window.navigator.permissions.query = (parameters) => (parameters.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : originalQuery(parameters));"
        ]
        
        for script in stealth_scripts:
            self.driver.execute_script(script)
    
    def parse_organization(self, url: str) -> dict:
        """
        Парсинг данных организации
        """
        try:
            logger.info(f"Парсинг URL: {url}")
            self.driver.get(url)

            time.sleep(5)
            
            data = {
                "name": self._get_name(),
                "rating": self._get_rating(),
                "reviews_count": self._get_reviews_count(),
                "address": self._get_address(),
                "phone": self._get_phone(),
                "website": self._get_website(),
                "working_hours": self._get_working_hours()
            }
            
            logger.info(f"Успешно спарсены данные: {data}")
            return data
            
        except Exception as e:
            logger.error(f"Ошибка при парсинге: {e}")
            raise
    
    def _get_name(self):
        try:
            return self.driver.find_element(By.CSS_SELECTOR, "h1").text
        except:
            return None
    
    def _get_rating(self):
        try:
            element = self.driver.find_element(By.CLASS_NAME, "business-header-rating-view__text")
            return element.text
        except:
            return None
    
    def _get_reviews_count(self):
        try:
            element = self.driver.find_element(By.CSS_SELECTOR, "[data-qa*='reviews']")
            return element.text
        except:
            return None
    
    def _get_address(self):
        try:
            element = self.driver.find_element(By.CSS_SELECTOR, "[class*='address']")
            return element.text
        except:
            return None
    
    def _get_phone(self):
        try:
            element = self.driver.find_element(By.CSS_SELECTOR, "[class*='phone']")
            return element.text
        except:
            return None
    
    def _get_website(self):
        try:
            element = self.driver.find_element(By.CSS_SELECTOR, "[class*='website']")
            return element.get_attribute("href")
        except:
            return None
    
    def _get_working_hours(self):
        try:
            element = self.driver.find_element(By.CSS_SELECTOR, "[class*='working-hours']")
            return element.text
        except:
            return None
    
    def close(self):
        if self.driver:
            self.driver.quit()
