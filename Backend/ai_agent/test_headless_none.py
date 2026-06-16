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

def _get_driver_none() -> webdriver.Chrome:
    options = Options()
    options.page_load_strategy = "none"  # Do not wait for any page load state!
    options.add_argument("--headless=new")
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

driver = _get_driver_none()
try:
    print("1. Navigating to linkedin homepage...", flush=True)
    driver.get("https://www.linkedin.com")
    time.sleep(3)  # Wait a bit for page to load initially
    
    print("2. Adding li_at cookie with secure=True...", flush=True)
    driver.add_cookie({
        "name": "li_at",
        "value": LINKEDIN_LI_AT,
        "domain": ".linkedin.com",
        "path": "/",
        "secure": True
    })
    
    print("3. Navigating directly to profile URL...", flush=True)
    driver.get("https://www.linkedin.com/in/ritesh-jadhav-019007319/")
    
    print("4. Waiting for page elements to load (polling)...", flush=True)
    start_time = time.time()
    found_profile = False
    
    for i in range(20):
        time.sleep(1.5)
        current_url = driver.current_url
        title = driver.title
        print(f"   [{i+1}] URL: {current_url} | Title: {title}", flush=True)
        
        # Check if we see elements
        nav_elements = driver.find_elements(By.CLASS_NAME, "global-nav__primary-link")
        top_cards = driver.find_elements(By.CLASS_NAME, "pv-top-card")
        body_text = driver.find_element(By.TAG_NAME, "body").text
        
        print(f"       Global Nav elements: {len(nav_elements)} | pv-top-card elements: {len(top_cards)}", flush=True)
        
        if len(nav_elements) > 0 or len(top_cards) > 0 or "Experience" in body_text:
            print("       Success! Logged in state detected.", flush=True)
            found_profile = True
            print("       Is 'Experience' in body?", "Experience" in body_text, flush=True)
            print("       Is 'Education' in body?", "Education" in body_text, flush=True)
            print("       Body text snippet:", body_text[:300].replace('\n', ' '), flush=True)
            break
            
        if "checkpoint" in current_url or "Security Verification" in body_text:
            print("       Checkpoint / challenge detected!", flush=True)
            break
            
    if not found_profile:
        print("   Failed to detect logged-in profile after 30 seconds.", flush=True)
        
except Exception as e:
    print("Error occurred:", e, flush=True)
finally:
    driver.quit()
