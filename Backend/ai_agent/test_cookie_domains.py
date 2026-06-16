import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from tools.linkedin_tool import _get_driver

LINKEDIN_LI_AT = os.getenv("LINKEDIN_LI_AT")

def test_cookie(domain_val, secure_val, path_val="/"):
    print(f"\n--- Testing with domain='{domain_val}', secure={secure_val}, path='{path_val}' ---", flush=True)
    driver = _get_driver()
    try:
        driver.get("https://www.linkedin.com/login")
        cookie_dict = {"name": "li_at", "value": LINKEDIN_LI_AT}
        if domain_val:
            cookie_dict["domain"] = domain_val
        if secure_val is not None:
            cookie_dict["secure"] = secure_val
        if path_val:
            cookie_dict["path"] = path_val
            
        driver.add_cookie(cookie_dict)
        print("  Cookies immediately after adding:")
        for c in driver.get_cookies():
            if c['name'] == 'li_at':
                print(f"    FOUND li_at: domain={c.get('domain')}, secure={c.get('secure')}, path={c.get('path')}", flush=True)
                
        driver.refresh()
        print("  Cookies after refresh:")
        found = False
        for c in driver.get_cookies():
            if c['name'] == 'li_at':
                found = True
                print(f"    FOUND li_at: domain={c.get('domain')}, secure={c.get('secure')}, path={c.get('path')}", flush=True)
        if not found:
            print("    NOT FOUND! Cookie disappeared.", flush=True)
    except Exception as e:
        print("  Error:", e, flush=True)
    finally:
        driver.quit()

test_cookie(domain_val=None, secure_val=True)
test_cookie(domain_val="www.linkedin.com", secure_val=True)
test_cookie(domain_val=".linkedin.com", secure_val=True)
test_cookie(domain_val="linkedin.com", secure_val=True)
