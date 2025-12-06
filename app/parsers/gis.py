from app.parsers.base import BaseParser
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time


class GisParser(BaseParser):
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
            el = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located(
                    (By.CLASS_NAME, "_y10azs")
                )
            )
            return el.text
        except:
            return None
    

    def getCountReviews(self):
        try:
            el = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located(
                    (By.CLASS_NAME, "_jspzdm")
                )
            )
            return el.text
        except:
            return None


    def openReviewsPage(self):
        try:
            tab = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located(
                    (By.XPATH, "//a[contains(@href,'tab/reviews')]")
                )
            )

            self.driver.execute_script("arguments[0].scrollIntoView(true);", tab)
            self.driver.execute_script("arguments[0].click();", tab)

            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "_1k5soqfl"))
            )
            return True

        except Exception as e:
            print("ERROR openReviewsPage:", e)
            return False
        
    def getReviews(self, limit=10):
        if not self.openReviewsPage():
            return []
    
        loaded = 0
        reviews = []
    
        for _ in range(6):  
            self.driver.execute_script("window.scrollBy(0, 600)")
            time.sleep(0.4)
    
            blocks = self.driver.find_elements(By.CLASS_NAME, "_1k5soqfl")
    
            for block in blocks:
                if loaded >= limit:
                    return reviews
    
                try:
                    name_el = block.find_elements(By.CLASS_NAME, "_16s5yj36")
                    if name_el:
                        name = name_el[0].get_attribute("textContent").strip()
                    else:
                        name = None
                except:
                    name = None
                
                try:
                    text_el = block.find_elements(By.CLASS_NAME, "_1msln3t")
                    if text_el:
                        text = text_el[0].get_attribute("textContent").strip()
                    else:
                        text = None
                except:
                    text = None

                try:
                    rating_block = block.find_elements(By.CLASS_NAME, "_1fkin5c")
                    if rating_block:
                        raiting = len(rating_block[0].find_elements(By.TAG_NAME, "span"))
                    else:
                        raiting = None
                except:
                    raiting = None

                try:
                    avatar_el = block.find_element(By.CLASS_NAME, "_1dk5lq4")
                    style = avatar_el.get_attribute("style")
                    avatar = None
                    if style and "background-image" in style:
                        avatar = style.split("url(")[1].split(")")[0]
                        avatar = avatar.replace('"', "").replace("'", "")
                except:
                    avatar = None
    
                reviews.append({
                    "name": name,
                    "text": text,
                    "raiting": raiting,
                    "avatar": avatar,
                })
    
                loaded += 1
        return reviews

