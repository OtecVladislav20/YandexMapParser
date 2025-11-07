from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time

options = Options()
options.add_argument('--headless=new')
options.add_argument("--user-data-dir=C:\\Temp\\ChromeProfile")
options.add_argument("--no-sandbox")

driver = webdriver.Chrome(options=options)

try:
    driver.get('https://yandex.ru/maps/org/blits_sam_/117320791407')
    time.sleep(3)

    count = driver.find_element(By.CLASS_NAME, "business-header-rating-view__text")
    text = count.text
    print(text)

finally:
    driver.quit()
