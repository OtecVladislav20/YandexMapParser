from app.parsers.base import BaseParser
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time


class YandexMapsParser(BaseParser):
    def build_driver_options(self):
        options = Options()
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")
        return options


    def extra_fields(self):
        return {
            # Добавляет дополнительные поля в парсинг
        }


    def getName(self):
        try:
            el = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located(
                    ((By.TAG_NAME, "h1"))
                ) 
            )
            return el.text
        except:
            return None
    

    def getRating(self):
        try:
            elements = WebDriverWait(self.driver, 10).until(
                EC.presence_of_all_elements_located(
                    (By.CLASS_NAME, "business-summary-rating-badge-view__rating-text")
                )
            )
            rating = "".join([el.text for el in elements]).strip()
            return rating or None
        except:
            return None
        
    def getCountReviews(self):
        try:
            el = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located(
                    (By.CLASS_NAME, "business-rating-amount-view")
                )
            )
            return el.text
        except:
            return None

        
    def getReviews(self, limit=10):
        try:
            for _ in range(5):
                self.driver.execute_script("window.scrollBy(0, 800)")
                time.sleep(0.5)

            blocks = self.driver.find_elements(
                By.CSS_SELECTOR, "div.business-review-view"
            )

            loaded = 0
            reviews = []

            for block in blocks:
                if loaded >= limit:
                    return reviews

                try:
                    name = block.find_element(
                        By.CSS_SELECTOR, "[itemprop='name']"
                    ).text.strip()
                except:
                    name = None

                try:
                    text = block.find_element(
                        By.CSS_SELECTOR, ".spoiler-view__text-container"
                    ).text.strip()
                except:
                    text = None

                try:
                    raiting = len(block.find_elements(
                        By.CSS_SELECTOR,
                        ".business-rating-badge-view__star._full"
                    ))
                except:
                    raiting = None

                try:
                    avatar_el = block.find_element(By.CSS_SELECTOR, ".user-icon-view__icon")
                    style = avatar_el.get_attribute("style")

                    avatar = None
                    if style and "url(" in style:
                        avatar = style.split("url(")[1].split(")")[0].replace('"', '').replace("'", "")
                except:
                    avatar = None

                reviews.append({
                    "name": name,
                    "raiting": raiting,
                    "text": text,
                    "avatar": avatar,
                })

                loaded += 1
            return reviews

        except Exception as e:
            print("Ошибка получения отзывов:", e)
            return []
