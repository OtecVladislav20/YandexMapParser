from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time


class GisParser:
    def __init__(self):
        self.driver = None
    

    def _init_driver(self):
        options = Options()
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")
        self.driver = webdriver.Chrome(options=options)


    def parse(self, url: str) -> dict:
        self._init_driver()
        self.driver.get(url)

        data = {
            'name': self.getName(),
            'raiting': self.getRaiting(),
            'count_reviews': self.getCountReviews(),
            'website': self.getWebsite(),
            'reviews': self.getReviews(),
        }

        self.driver.quit()
        return data


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
    

    def getRaiting(self):
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
    

    def getWebsite(self):
        try:
            el = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, "div._49kxlr a._1rehek")
                )
            )
            return el.text
        except:
            return None
        


    def openReviewsPage(self):
        try:
            # находим таб именно по тексту, это 100% правильный вариант
            tab = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located(
                    (By.XPATH, "//a[contains(@href,'tab/reviews')]")
                )
            )

            # делаем элемент в зоне видимости
            self.driver.execute_script("arguments[0].scrollIntoView(true);", tab)

            # теперь только кликаем
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
    
        import time
    
        loaded = 0
        reviews = []
    
        # скроллим страницу, но не до конца
        for _ in range(6):  
            self.driver.execute_script("window.scrollBy(0, 600)")
            time.sleep(0.4)
    
            blocks = self.driver.find_elements(By.CLASS_NAME, "_1k5soqfl")
    
            for block in blocks:
                if loaded >= limit:
                    return reviews
    
                # получаем имя правильным способом
                name_el = block.find_elements(By.CLASS_NAME, "_16s5yj36")
                if name_el:
                    name = name_el[0].get_attribute("textContent").strip()
                else:
                    continue
                
                # получаем текст отзыва
                text_el = block.find_elements(By.CLASS_NAME, "_1msln3t")
                if text_el:
                    text = text_el[0].get_attribute("textContent").strip()
                else:
                    text = None
    
                reviews.append({
                    "name": name,
                    "text": text,
                })
    
                loaded += 1
    
        return reviews