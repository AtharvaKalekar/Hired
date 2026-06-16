import os
import sys
import time
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

LINKEDIN_LI_AT = os.getenv("LINKEDIN_LI_AT")
print("LINKEDIN_LI_AT:", LINKEDIN_LI_AT[:10] + "..." if LINKEDIN_LI_AT else "None")

def _get_headful_driver() -> webdriver.Chrome:
    options = Options()
    options.page_load_strategy = "eager"
    # Commented out headless mode to run headfully
    # options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.binary_location = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(30)
    return driver

driver = _get_headful_driver()
try:
    print("1. Navigating to linkedin homepage to get initial cookies...", flush=True)
    driver.get("https://www.linkedin.com")
    print("   Initial URL:", driver.current_url, flush=True)
    
    print("2. Adding li_at cookie...", flush=True)
    driver.add_cookie({
        "name": "li_at",
        "value": LINKEDIN_LI_AT,
        "domain": ".linkedin.com",
        "path": "/",
        "secure": True
    })
    
    print("3. Cookies currently set in browser:", flush=True)
    for c in driver.get_cookies():
        if c['name'] == 'li_at':
            print(f"   - {c['name']}: domain={c.get('domain')}, secure={c.get('secure')}", flush=True)
            
    print("4. Navigating directly to profile page...", flush=True)
    driver.get("https://www.linkedin.com/in/ritesh-jadhav-019007319/")
    print("   URL after profile navigation:", driver.current_url, flush=True)
    print("   Page Title after profile navigation:", driver.title, flush=True)
    
    # Check if logged in
    nav_elements = driver.find_elements(By.CLASS_NAME, "global-nav__primary-link")
    print("   Global Nav elements found:", len(nav_elements), flush=True)
    
    body_text = driver.find_element(By.TAG_NAME, "body").text
    print("   Is 'Sign in' in body?", "Sign in" in body_text, flush=True)
    print("   Is 'Experience' in body?", "Experience" in body_text, flush=True)
    print("   First 300 chars of body text:", body_text[:300].replace('\n', ' '), flush=True)
    
    # Let it stay open for a couple of seconds so we can inspect
    time.sleep(5)
    
except Exception as e:
    print("Error occurred:", e, flush=True)
finally:
    driver.quit()
