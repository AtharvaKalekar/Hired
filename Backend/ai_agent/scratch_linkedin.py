import os
import sys
from dotenv import load_dotenv

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from tools.linkedin_tool import get_linkedin_profile

url = "https://www.linkedin.com/in/ritesh-jadhav-019007319/"
res = get_linkedin_profile.func(url)
print("\n=== SCRAPE RESULT ===")
print(res)
