import os
import sys
import time
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from tools.linkedin_tool import _get_driver
from selenium.webdriver.common.by import By

LINKEDIN_LI_AT = os.getenv("LINKEDIN_LI_AT")
print("LINKEDIN_LI_AT:", LINKEDIN_LI_AT[:10] + "..." if LINKEDIN_LI_AT else "None")

driver = _get_driver()
try:
    print("1. Navigating to login page...", flush=True)
    driver.get("https://www.linkedin.com/login")
    
    print("2. Adding li_at cookie with secure=True...", flush=True)
    driver.add_cookie({
        "name": "li_at",
        "value": LINKEDIN_LI_AT,
        "domain": ".linkedin.com",
        "path": "/",
        "secure": True
    })
    
    print("3. Cookies after adding:", flush=True)
    for c in driver.get_cookies():
        if c['name'] == 'li_at':
            print(f"  FOUND li_at: domain={c['domain']}, secure={c.get('secure')}, expiry={c.get('expiry')}", flush=True)
            
    print("4. Refreshing page...", flush=True)
    driver.refresh()
    print("   URL after refresh:", driver.current_url, flush=True)
    
    print("5. Cookies after refresh:", flush=True)
    found = False
    for c in driver.get_cookies():
        if c['name'] == 'li_at':
            found = True
            print(f"  FOUND li_at: domain={c['domain']}, secure={c.get('secure')}", flush=True)
    if not found:
        print("  WARNING: li_at cookie disappeared after refresh!", flush=True)
        
    print("6. Navigating to profile...", flush=True)
    driver.get("https://www.linkedin.com/in/ritesh-jadhav-019007319/")
    print("   URL after profile navigation:", driver.current_url, flush=True)
    
    # Check if logged in
    nav_elements = driver.find_elements(By.CLASS_NAME, "global-nav__primary-link")
    print("   Global Nav elements on profile page:", len(nav_elements), flush=True)
    
    body_text = driver.find_element(By.TAG_NAME, "body").text
    print("   Is 'Sign in' in body?", "Sign in" in body_text, flush=True)
    print("   Is 'Experience' in body?", "Experience" in body_text, flush=True)
    
except Exception as e:
    print("Error occurred:", e, flush=True)
finally:
    driver.quit()
