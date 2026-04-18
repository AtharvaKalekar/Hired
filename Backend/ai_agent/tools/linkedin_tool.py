import os
from crewai.tools import tool
from linkedin_scraper import Person, login_with_credentials
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


LINKEDIN_EMAIL = os.getenv("LINKEDIN_EMAIL", "")
LINKEDIN_PASSWORD = os.getenv("LINKEDIN_PASSWORD", "")


def _get_driver() -> webdriver.Chrome:
    """Creates a headless Chrome WebDriver instance."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    # Use the system Chrome installation
    options.binary_location = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    driver = webdriver.Chrome(options=options)
    return driver


@tool("Fetch LinkedIn Profile Data")
def get_linkedin_profile(linkedin_url: str) -> str:
    """
    Scrapes a LinkedIn public profile URL using the linkedin_scraper library.
    Requires LINKEDIN_EMAIL and LINKEDIN_PASSWORD env variables to be set.
    Returns a formatted text summary of the profile including experience and education.
    """
    if not LINKEDIN_EMAIL or not LINKEDIN_PASSWORD:
        return "Error: LINKEDIN_EMAIL and LINKEDIN_PASSWORD environment variables are not set."

    driver = None
    try:
        driver = _get_driver()
        login_with_credentials(driver, LINKEDIN_EMAIL, LINKEDIN_PASSWORD)
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
