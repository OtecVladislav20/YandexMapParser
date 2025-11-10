from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import logging
import os

logger = logging.getLogger(__name__)

class YandexMapsParser:
    def __init__(self, chrome_profile_dir: str = None, profile_directory: str = None, headless: bool = False):
        self.chrome_profile_dir = chrome_profile_dir
        self.profile_directory = profile_directory
        self.headless = headless
        self.driver = None
        self.setup_driver()

    def setup_driver(self):
        options = Options()

        if self.headless:
            options.add_argument("--headless=new")

        # Mobile emulation (Pixel 5-like)
        mobile_user_agent = (
            "Mozilla/5.0 (Linux; Android 11; Pixel 5) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        )
        mobile_emulation = {
            "deviceMetrics": {"width": 412, "height": 915, "pixelRatio": 3.0},
            "userAgent": mobile_user_agent
        }
        options.add_experimental_option("mobileEmulation", mobile_emulation)

        # Общие опции
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=412,915")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
        options.add_experimental_option('useAutomationExtension', False)
        options.add_argument(f'--user-agent={mobile_user_agent}')

        if self.chrome_profile_dir:
            if not os.path.exists(self.chrome_profile_dir):
                raise ValueError(f"Chrome profile dir not found: {self.chrome_profile_dir}")
            options.add_argument(f"--user-data-dir={self.chrome_profile_dir}")
            if self.profile_directory:
                options.add_argument(f"--profile-directory={self.profile_directory}")

        self.driver = webdriver.Chrome(options=options)

        # Touch emulation через CDP
        try:
            self.driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {
                "width": 412,
                "height": 915,
                "deviceScaleFactor": 3.0,
                "mobile": True
            })
            self.driver.execute_cdp_cmd("Emulation.setTouchEmulationEnabled", {"enabled": True})
        except Exception:
            pass

        # stealth-like инъекции
        stealth_scripts = [
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});",
            "Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});",
            "Object.defineProperty(navigator, 'languages', {get: () => ['ru-RU', 'ru', 'en']});",
            "const originalQuery = window.navigator.permissions.query; window.navigator.permissions.query = (parameters) => (parameters.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : originalQuery(parameters));"
        ]
        try:
            for script in stealth_scripts:
                self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": script})
        except Exception:
            pass

        self.driver.set_page_load_timeout(60)
        self.driver.implicitly_wait(5)

    def close_app_banner(self):
        """Закрываем баннер 'Установите приложение' на мобильной версии"""
        try:
            close_btn = WebDriverWait(self.driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "span[aria-label='Закрыть']"))
            )
            # JS-клик для надежности
            self.driver.execute_script("arguments[0].click();", close_btn)
            time.sleep(0.5)
        except:
            pass

    def parse_organization(self, url: str) -> dict:
        try:
            logger.info(f"Парсинг URL: {url}")
            self.driver.get(url)
            time.sleep(5)  # даём странице прогрузиться
            self.close_app_banner()  # закрываем баннер сразу после загрузки

            data = {
                "name": self._get_name(),
                "rating": self._get_rating(),
                "reviews_count": self._get_reviews_count(),
                "address": self._get_address(),
                # "phone": self._get_phone(),
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
        elements = self.driver.find_elements(By.CLASS_NAME, "business-summary-rating-badge-view__rating-text")
        if len(elements) >= 2:
            first = elements[0].text
            second = elements[2].text
            return first + ',' + second
        else:
            return None

    def _get_reviews_count(self):
        try:
            # Основной селектор для количества отзывов
            element = self.driver.find_element(By.CSS_SELECTOR, "[class*='business-rating-amount-view']")
            return element.text
        except:
            return None

    def _get_address(self):
        try:
            element = self.driver.find_element(By.CSS_SELECTOR, "[class*='address']")
            return element.text
        except:
            return None

    # def _get_phone(self):
    #     try:
    #         element = self.driver.find_element(By.CSS_SELECTOR, "[class*='phone']")
    #         return element.text
    #     except:
    #         return None

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
