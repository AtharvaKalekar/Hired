import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from tools.linkedin_tool import _get_driver

driver = _get_driver()
try:
    driver.get("https://www.linkedin.com")
    webdriver_val = driver.execute_script("return navigator.webdriver")
    user_agent = driver.execute_script("return navigator.userAgent")
    print("navigator.webdriver:", webdriver_val)
    print("navigator.userAgent:", user_agent)
except Exception as e:
    print("Error:", e)
finally:
    driver.quit()
