import os
from crewai.tools import tool
from linkedin_scraper import Person, actions
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


LINKEDIN_EMAIL = os.getenv("LINKEDIN_EMAIL", "")
LINKEDIN_PASSWORD = os.getenv("LINKEDIN_PASSWORD", "")
LINKEDIN_LI_AT = os.getenv("LINKEDIN_LI_AT", "")


def _get_driver() -> webdriver.Chrome:
    """Creates a headless Chrome WebDriver instance with human-like parameters."""
    options = Options()
    options.page_load_strategy = "eager"  # Do not wait for stylesheets/images to load
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    # Use the system Chrome installation
    options.binary_location = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(30)  # Stop hanging forever if a page fails to respond
    return driver


@tool("Fetch LinkedIn Profile Data")
def get_linkedin_profile(linkedin_url: str) -> str:
    """
    Scrapes a LinkedIn public profile URL using the linkedin_scraper library.
    Requires LINKEDIN_LI_AT cookie or LINKEDIN_EMAIL and LINKEDIN_PASSWORD env variables.
    Returns a formatted text summary of the profile including experience and education.
    """
    if not LINKEDIN_LI_AT and (not LINKEDIN_EMAIL or not LINKEDIN_PASSWORD):
        return "Error: Neither LINKEDIN_LI_AT cookie nor LINKEDIN_EMAIL/LINKEDIN_PASSWORD are set."

    driver = None
    try:
        driver = _get_driver()
        try:
            if LINKEDIN_LI_AT:
                print("[LinkedIn Scraper] Authenticating via session cookie...")
                actions.login(driver, cookie=LINKEDIN_LI_AT)
            else:
                print("[LinkedIn Scraper] Authenticating via email/password credentials...")
                actions.login(driver, LINKEDIN_EMAIL, LINKEDIN_PASSWORD)
        except Exception as login_err:
            current_url = driver.current_url if driver else "Unknown"
            print(f"[LinkedIn Scraper Debug] Login failed. Final browser URL: {current_url}")
            raise Exception(f"Login failed at {current_url}. Error: {login_err}")

        person = Person(linkedin_url, driver=driver, scrape=True, close_on_complete=False)

        experiences = []
        for exp in getattr(person, "experiences", []):
            experiences.append(
                f"  - {getattr(exp, 'position_title', 'N/A')} at {getattr(exp, 'institution_name', 'N/A')} "
                f"({getattr(exp, 'from_date', '?')} - {getattr(exp, 'to_date', 'Present')})"
            )

        educations = []
        for edu in getattr(person, "educations", []):
            educations.append(
                f"  - {getattr(edu, 'degree', 'N/A')} at {getattr(edu, 'institution_name', 'N/A')} "
                f"({getattr(edu, 'from_date', '?')} - {getattr(edu, 'to_date', '?')})"
            )

        result = f"""
=== LinkedIn Profile: {linkedin_url} ===
Name: {getattr(person, 'name', 'N/A')}
Job Title: {getattr(person, 'job_title', 'N/A')}
Company: {getattr(person, 'company', 'N/A')}
Location: {getattr(person, 'location', 'N/A')}
About: {getattr(person, 'about', 'N/A')}

--- Experience ---
{chr(10).join(experiences) if experiences else '  No experiences found.'}

--- Education ---
{chr(10).join(educations) if educations else '  No education found.'}
"""
        return result.strip()

    except Exception as e:
        return f"Error scraping LinkedIn profile: {e}"
    finally:
        if driver:
            driver.quit()
