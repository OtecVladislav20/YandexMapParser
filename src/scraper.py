from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time

options = Options()
options.add_argument('--headless=new')
driver = webdriver.Chrome(
    options=options, 
    # другие свойства...
) 

options.add_argument("--disable-blink-features=AutomationControlled")
options.add_experimental_option("excludeSwitches", ["enable-automation"])
options.add_experimental_option('useAutomationExtension', False)
options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
driver = webdriver.Chrome(options=options)
driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")


driver.get('https://yandex.ru/maps/org/blits_sam_/117320791407')
time.sleep(3)

count = driver.find_element(By.CLASS_NAME, "business-header-rating-view__text")
text = count.text
print(text)

driver.quit()