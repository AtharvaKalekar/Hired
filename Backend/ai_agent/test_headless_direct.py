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
    print("1. Navigating to linkedin homepage (headless)...", flush=True)
    driver.get("https://www.linkedin.com")
    
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
    print("   URL after profile navigation:", driver.current_url, flush=True)
    print("   Page Title after profile navigation:", driver.title, flush=True)
    
    # Check if global navigation is present (indicating logged in)
    nav_elements = driver.find_elements(By.CLASS_NAME, "global-nav__primary-link")
    print("   Global Nav elements found:", len(nav_elements), flush=True)
    
    # Print page text to see if it shows experiences
    body_text = driver.find_element(By.TAG_NAME, "body").text
    print("   Is 'Experience' in body?", "Experience" in body_text, flush=True)
    print("   Is 'Education' in body?", "Education" in body_text, flush=True)
    print("   Is 'Sign in' in body?", "Sign in" in body_text, flush=True)
    print("   First 300 chars of body text:", body_text[:300].replace('\n', ' '), flush=True)
    
except Exception as e:
    print("Error occurred:", e, flush=True)
finally:
    driver.quit()
