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

        # Десктопный User-Agent (Windows + Chrome)
        desktop_user_agent = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )

        # Общие опции для десктопа
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")  # Десктопное разрешение
        options.add_argument("--start-maximized")  # Запуск в максимизированном окне
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
        options.add_experimental_option('useAutomationExtension', False)
        options.add_argument(f'--user-agent={desktop_user_agent}')

        # Дополнительные опции для лучшей скрытности
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-plugins-discovery")
        options.add_argument("--disable-background-timer-throttling")
        options.add_argument("--disable-backgrounding-occluded-windows")
        options.add_argument("--disable-renderer-backgrounding")
        options.add_argument("--disable-features=TranslateUI")
        options.add_argument("--disable-ipc-flooding-protection")
        options.add_argument("--disable-renderer-backgrounding")

        # Использование профиля Chrome если указан
        if self.chrome_profile_dir:
            if not os.path.exists(self.chrome_profile_dir):
                raise ValueError(f"Chrome profile dir not found: {self.chrome_profile_dir}")
            options.add_argument(f"--user-data-dir={self.chrome_profile_dir}")
            if self.profile_directory:
                options.add_argument(f"--profile-directory={self.profile_directory}")

        self.driver = webdriver.Chrome(options=options)

        # Десктопные настройки через CDP
        try:
            self.driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {
                "width": 1920,
                "height": 1080,
                "deviceScaleFactor": 1.0,
                "mobile": False,  # Важно: false для десктопа
                "screenWidth": 1920,
                "screenHeight": 1080
            })
            # Отключаем touch эмуляцию для десктопа
            self.driver.execute_cdp_cmd("Emulation.setTouchEmulationEnabled", {"enabled": False})
        except Exception:
            pass

        # Stealth инъекции для десктопа
        stealth_scripts = [
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});",
            "Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});",
            "Object.defineProperty(navigator, 'languages', {get: () => ['ru-RU', 'ru', 'en']});",
            "Object.defineProperty(navigator, 'platform', {get: () => 'Win32'});",
            "Object.defineProperty(navigator, 'hardwareConcurrency', {get: () => 8});",
            "Object.defineProperty(navigator, 'maxTouchPoints', {get: () => 0});",
            "const originalQuery = window.navigator.permissions.query; window.navigator.permissions.query = (parameters) => (parameters.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : originalQuery(parameters));",
            # Эмуляция WebGL для десктопа
            "const getParameter = WebGLRenderingContext.getParameter; WebGLRenderingContext.prototype.getParameter = function(parameter) { if (parameter === 37445) { return 'Intel Open Source Technology Center'; } if (parameter === 37446) { return 'Mesa DRI Intel(R) HD Graphics'; } return getParameter(parameter); };"
        ]

        try:
            for script in stealth_scripts:
                self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": script})
        except Exception:
            pass

        # Дополнительные настройки для реалистичности
        try:
            # Устанавливаем часовой пояс
            self.driver.execute_cdp_cmd("Emulation.setTimezoneOverride", {"timezoneId": "Europe/Moscow"})
            # Устанавливаем геолокацию (Москва)
            self.driver.execute_cdp_cmd("Emulation.setGeolocationOverride", {
                "latitude": 55.7558,
                "longitude": 37.6173,
                "accuracy": 100
            })
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
        # elements = self.driver.find_elements(By.CLASS_NAME, "business-summary-rating-badge-view__rating-text")
        elements = self.driver.find_elements(By.CLASS_NAME, "_y10azs")
        # if len(elements) >= 2:
        #     first = elements[0].text
        #     second = elements[2].text
        #     return first + ',' + second
        # else:
        #     return None
        return elements[0].text

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
