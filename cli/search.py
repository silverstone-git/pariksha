import os
import requests
import json
import io
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
from smolagents import tool
from scrapy import Selector
from scrapy.http import HtmlResponse

try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logging.warning("pdfplumber not available. Install with: pip install pdfplumber")

MANUAL_DRIVER_PATH = "/usr/local/bin/chromedriver_142"
CHROMIUM_PATH = "/usr/bin/chromium"

# Configure logging for better visibility
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def _clean_text(text: str) -> str:
    """
    Cleans text by removing binary artifacts and keeping valid characters.
    Preserves alphanumeric, punctuation, emojis, and whitespace.
    """
    if not text:
        return ""
        
    # Filter for printable characters (including whitespace)
    # This preserves emojis and international text usually
    # removing low control chars except \n\r\t
    cleaned = "".join(ch for ch in text if ch.isprintable() or ch in "\n\r\t")
    
    return cleaned

def _extract_pdf_text(content: bytes) -> str:
    """Extract text from PDF content bytes using pdfplumber."""
    if not PDF_AVAILABLE:
        return "Error: pdfplumber not installed, cannot read PDF."
    
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            text = []
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
            
            full_text = "\n\n".join(text)
            return _clean_text(full_text)
    except Exception as e:
        return f"Error extracting PDF text: {e}"

# Try to import Selenium (optional for JavaScript rendering)
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver import ChromeService
    from webdriver_manager.chrome import ChromeDriverManager
    from selenium.common.exceptions import NoSuchDriverException
    SELENIUM_AVAILABLE = True
    logging.info("Selenium is available for JavaScript rendering")
except ImportError:
    SELENIUM_AVAILABLE = False
    logging.warning("Selenium not available. Install with: pip install selenium webdriver-manager")

def _is_valid_url(text: str) -> bool:
    """
    Check if the given text is a valid URL.
    
    Args:
        text (str): Text to validate as URL
        
    Returns:
        bool: True if valid URL, False otherwise
    """
    try:
        result = urlparse(text)
        return all([result.scheme in ['http', 'https'], result.netloc])
    except Exception:
        return False


def _get_selenium_driver():
    """
    Create and configure a Selenium WebDriver for headless browsing.
    
    Returns:
        webdriver.Chrome: Configured Chrome WebDriver or None if unavailable
    """
    from selenium.common.exceptions import NoSuchDriverException
    if not SELENIUM_AVAILABLE:
        return None
    
    try:
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        try:
            chrome_options.binary_location= CHROMIUM_PATH
            service = ChromeService(executable_path= MANUAL_DRIVER_PATH)
            driver = webdriver.Chrome(service=service, options=chrome_options)
        except NoSuchDriverException as e:
            print("\n\n\n\nCAUGHT THE ERROR \n\n\n")
            chrome_options.binary_location= ''
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
        return driver
    
    except Exception as e:
        print(e.__class__)
        logging.error(f"Failed to initialize Selenium driver: {e}")
        return None


def _extract_element_info(selector: Selector) -> dict:
    """
    Extract detailed information about HTML elements including bounding boxes,
    text content, images, and divs.
    
    Args:
        selector (Selector): Scrapy selector object
        
    Returns:
        dict: Structured data with text, images, and div information
    """
    extracted_data = {
        "text_content": [],
        "images": [],
        "divs": [],
        "links": [],
        "metadata": {}
    }
    
    # Extract metadata
    try:
        title = selector.xpath('//title/text()').get()
        if title:
            extracted_data["metadata"]["title"] = title.strip()
        
        meta_desc = selector.xpath('//meta[@name="description"]/@content').get()
        if meta_desc:
            extracted_data["metadata"]["description"] = meta_desc.strip()
            
        og_title = selector.xpath('//meta[@property="og:title"]/@content').get()
        if og_title:
            extracted_data["metadata"]["og_title"] = og_title.strip()
            
        og_image = selector.xpath('//meta[@property="og:image"]/@content').get()
        if og_image:
            extracted_data["metadata"]["og_image"] = og_image.strip()
    except Exception as e:
        logging.warning(f"Error extracting metadata: {e}")
    
    # Extract text content from important elements
    text_elements = selector.xpath('''
        //p | //h1 | //h2 | //h3 | //h4 | //h5 | //h6 | 
        //li | //td | //th | //span[string-length(normalize-space(text())) > 20] |
        //article | //section | //blockquote
    ''')
    
    seen_texts = set()
    for elem in text_elements:
        try:
            text = elem.xpath('normalize-space(string(.))').get()
            if text and len(text.strip()) > 10 and text not in seen_texts:
                seen_texts.add(text)
                
                tag_name = elem.xpath('name()').get()
                text_info = {
                    "tag": tag_name,
                    "text": text.strip()[:1000]  # Limit text length
                }
                
                elem_class = elem.xpath('@class').get()
                elem_id = elem.xpath('@id').get()
                if elem_class:
                    text_info["class"] = elem_class
                if elem_id:
                    text_info["id"] = elem_id
                    
                extracted_data["text_content"].append(text_info)
        except Exception as e:
            logging.debug(f"Error extracting text element: {e}")
    
    # Extract images with their attributes
    images = selector.xpath('//img')
    for img in images:
        try:
            img_data = {
                "src": img.xpath('@src').get(),
                "alt": img.xpath('@alt').get(),
                "title": img.xpath('@title').get(),
                "class": img.xpath('@class').get(),
                "id": img.xpath('@id').get(),
            }
            
            width = img.xpath('@width').get()
            height = img.xpath('@height').get()
            if width:
                img_data["width"] = width
            if height:
                img_data["height"] = height
            
            parent_tag = img.xpath('name(..)').get()
            if parent_tag:
                img_data["parent_tag"] = parent_tag
                
            # Filter out tracking pixels and tiny images
            if img_data["src"] and not any(x in str(img_data["src"]).lower() for x in ['pixel', 'tracker', '1x1']):
                extracted_data["images"].append(img_data)
        except Exception as e:
            logging.debug(f"Error extracting image: {e}")
    
    # Extract meaningful divs with content
    divs = selector.xpath('//div[@id or @class][string-length(normalize-space(string(.))) > 50]')
    for div in divs[:50]:
        try:
            div_data = {
                "id": div.xpath('@id').get(),
                "class": div.xpath('@class').get(),
                "text_preview": div.xpath('normalize-space(string(.))').get()[:200],
            }
            
            child_count = len(div.xpath('./*'))
            if child_count > 0:
                div_data["child_count"] = child_count
                
            extracted_data["divs"].append(div_data)
        except Exception as e:
            logging.debug(f"Error extracting div: {e}")
    
    # Extract links
    links = selector.xpath('//a[@href]')
    for link in links[:100]:
        try:
            href = link.xpath('@href').get()
            text = link.xpath('normalize-space(string(.))').get()
            if href and text:
                link_data = {
                    "href": href,
                    "text": text.strip()[:200],
                    "title": link.xpath('@title').get()
                }
                extracted_data["links"].append(link_data)
        except Exception as e:
            logging.debug(f"Error extracting link: {e}")
    
    return extracted_data


def _scrape_with_selenium(url: str, timeout: int = 30, wait_time: int = 3) -> dict:
    """
    Scrape a URL using Selenium for JavaScript-rendered content (React, Vue, Angular, etc.).
    
    Args:
        url (str): The URL to scrape
        timeout (int): Page load timeout in seconds
        wait_time (int): Time to wait for JavaScript to render content
        
    Returns:
        dict: Extracted data including text, images, divs, and metadata
    """
    if not SELENIUM_AVAILABLE:
        return {
            "url": url,
            "error": "Selenium not available. Install with: pip install selenium webdriver-manager"
        }
    
    driver = None
    try:
        logging.info(f"Scraping URL with Selenium (JS rendering): {url}")
        
        driver = _get_selenium_driver()
        if not driver:
            return {"url": url, "error": "Failed to initialize Selenium WebDriver"}
        
        driver.set_page_load_timeout(timeout)
        driver.get(url)
        
        # Wait for JavaScript to render
        import time
        time.sleep(wait_time)
        
        # Try to wait for body to be present
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        except:
            pass  # Continue even if wait times out
        
        # Get the rendered HTML
        page_source = driver.page_source
        
        # Create Scrapy selector from rendered HTML
        selector = Selector(text=page_source)
        
        # Extract detailed information
        extracted_data = _extract_element_info(selector)
        extracted_data["url"] = url
        extracted_data["rendering_method"] = "selenium"
        extracted_data["javascript_rendered"] = True
        
        # Add clean text summary
        all_text = " ".join([item["text"] for item in extracted_data["text_content"]])
        extracted_data["clean_text_summary"] = _clean_text(all_text[:5000])
        
        return extracted_data
        
    except Exception as e:
        logging.error(f"Error during Selenium scraping of {url}: {e}")
        return {"url": url, "error": f"Selenium scraping failed: {e}"}
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass


def _scrape_url_with_scrapy(url: str, timeout: int = 15) -> dict:
    """
    Scrape a URL using Scrapy's selector for detailed extraction.
    Works well for static sites but may miss JavaScript-rendered content.
    
    Args:
        url (str): The URL to scrape
        timeout (int): Timeout in seconds for the HTTP request
        
    Returns:
        dict: Extracted data including text, images, divs, and metadata
    """
    try:
        logging.info(f"Scraping URL with Scrapy (static HTML): {url}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, timeout=timeout, headers=headers)
        response.raise_for_status()
        
        # Check for PDF
        content_type = response.headers.get('Content-Type', '').lower()
        if 'application/pdf' in content_type or url.lower().endswith('.pdf'):
            logging.info(f"Detected PDF content for URL: {url}")
            text = _extract_pdf_text(response.content)
            return {
                "url": url,
                "text_content": [{"tag": "pdf_content", "text": text[:5000]}],
                "clean_text_summary": text[:5000],
                "images": [],
                "links": [],
                "metadata": {"content_type": "application/pdf"},
                "rendering_method": "pdfplumber",
                "javascript_rendered": False
            }
        
        scrapy_response = HtmlResponse(
            url=url,
            body=response.content,
            encoding=response.encoding or 'utf-8'
        )
        
        selector = Selector(response=scrapy_response)
        
        extracted_data = _extract_element_info(selector)
        extracted_data["url"] = url
        extracted_data["status_code"] = response.status_code
        extracted_data["rendering_method"] = "static"
        extracted_data["javascript_rendered"] = False
        
        all_text = " ".join([item["text"] for item in extracted_data["text_content"]])
        
        # Clean the text summary
        extracted_data["clean_text_summary"] = _clean_text(all_text[:5000])
        
        return extracted_data
        
    except requests.exceptions.Timeout:
        logging.warning(f"Timeout scraping URL: {url}")
        return {"url": url, "error": f"Timeout after {timeout} seconds"}
    except requests.exceptions.RequestException as e:
        logging.error(f"Error scraping URL {url}: {e}")
        return {"url": url, "error": f"Failed to scrape: {e}"}
    except Exception as e:
        logging.error(f"Unexpected error scraping {url}: {e}")
        return {"url": url, "error": f"Error during scraping: {e}"}


def _fetch_and_extract_text(url: str, timeout: int = 10) -> dict:
    """
    Fetches the content of a URL and extracts all visible text (excluding HTML/CSS).
    Legacy function for backward compatibility.
    """
    try:
        logging.info(f"Attempting to fetch and parse URL: {url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, timeout=timeout, headers=headers)
        response.raise_for_status()

        # Check for PDF
        content_type = response.headers.get('Content-Type', '').lower()
        if 'application/pdf' in content_type or url.lower().endswith('.pdf'):
            logging.info(f"Detected PDF content for URL: {url}")
            text = _extract_pdf_text(response.content)
            return {
                "url": url,
                "extracted_text": text,
                "is_pdf": True
            }

        soup = BeautifulSoup(response.text, 'html.parser')

        for script_or_style in soup(['script', 'style']):
            script_or_style.extract()

        text = soup.get_text(separator='\n', strip=True)
        
        # Clean the text
        text = _clean_text(text)

        return {
            "url": url,
            "extracted_text": text
        }
    except requests.exceptions.Timeout:
        logging.warning(f"Timeout fetching URL: {url}")
        return {"url": url, "error": f"Timeout after {timeout} seconds"}
    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching URL {url}: {e}")
        return {"url": url, "error": f"Failed to fetch: {e}"}
    except Exception as e:
        logging.error(f"An unexpected error occurred while parsing {url}: {e}")
        return {"url": url, "error": f"Error parsing content: {e}"}


@tool
def brave_search_tool(
    query: str, 
    num_results: int = 5, 
    fetch_full_text: bool = False, 
    full_text_timeout: int = 10,
    use_detailed_scraping: bool = False,
    render_javascript: bool = False,
    js_wait_time: int = 3
) -> str:
    """
    Performs a web search using the Brave Search API OR directly scrapes a URL if the query is a valid URL.
    
    This tool handles:
    1. URL Mode: If query is a valid URL, it directly scrapes that URL
    2. Search Mode: If query is not a URL, it performs a Brave Search
    3. JavaScript Rendering: Optionally uses Selenium to render React/SPA sites
    
    Args:
        query (str): The search query OR a direct URL to scrape.
        num_results (int): Maximum number of search results (default: 5). Ignored in URL mode.
        fetch_full_text (bool): If True, fetches content from search result URLs (default: False).
        full_text_timeout (int): Timeout in seconds for fetching each page (default: 10).
        use_detailed_scraping (bool): If True, extracts images, divs, metadata, etc. (default: False).
        render_javascript (bool): If True, uses Selenium to render JavaScript (React, Vue, Angular).
                                 Required for SPAs. Needs selenium + webdriver-manager installed.
                                 (default: False)
        js_wait_time (int): Seconds to wait for JavaScript to render when using Selenium (default: 3).

    Returns:
        str: JSON string with results.
             URL mode: Detailed scraped data (text_content, images, divs, links, metadata)
             Search mode: List of search results with optional full_text/scraped_data
    """
    
    # Check if query is a direct URL
    if _is_valid_url(query):
        logging.info(f"Detected direct URL: {query}. Switching to URL scraping mode.")
        
        if render_javascript:
            scraped_data = _scrape_with_selenium(query, timeout=full_text_timeout, wait_time=js_wait_time)
        elif use_detailed_scraping:
            scraped_data = _scrape_url_with_scrapy(query, timeout=full_text_timeout)
        else:
            scraped_data = _fetch_and_extract_text(query, timeout=full_text_timeout)
            
        return json.dumps(scraped_data, indent=2, ensure_ascii=False)
    
    # Proceed with Brave Search
    api_key = os.getenv("BRAVE_API_KEY")
    if not api_key:
        return json.dumps({"error": "Brave Search API key not found. Please set the BRAVE_API_KEY environment variable."})

    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": api_key
    }
    params = {
        "q": query,
        "count": num_results,
        "offset": 0,
        "country": "us",
        "search_lang": "en"
    }

    try:
        logging.info(f"Initiating Brave Search for query: '{query}' with {num_results} results.")
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()

        data = response.json()
        raw_web_results = []
        if 'web' in data and 'results' in data['web']:
            raw_web_results = data['web']['results']
        else:
            logging.warning("No web results found in Brave Search response.")
            return json.dumps({"error": "No web results found in Brave Search response.", "raw_response": data})

        formatted_results = []
        urls_to_fetch = []

        for result in raw_web_results:
            formatted_item = {
                "title": result.get("title"),
                "url": result.get("url"),
                "snippet": result.get("description")
            }
            formatted_results.append(formatted_item)
            if fetch_full_text and result.get("url"):
                urls_to_fetch.append(result["url"])

        if fetch_full_text and urls_to_fetch:
            logging.info(f"Fetching full text for {len(urls_to_fetch)} URLs.")
            
            # Choose scraping method
            if render_javascript:
                scrape_function = lambda url, timeout: _scrape_with_selenium(url, timeout, js_wait_time)
            elif use_detailed_scraping:
                scrape_function = _scrape_url_with_scrapy
            else:
                scrape_function = _fetch_and_extract_text
            
            # Use ThreadPoolExecutor for concurrent fetching
            # Note: Selenium is slower, so limit workers more aggressively
            max_workers = 2 if render_javascript else min(len(urls_to_fetch), 5)
            
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_url = {executor.submit(scrape_function, url, full_text_timeout): url for url in urls_to_fetch}
                for future in as_completed(future_to_url):
                    url = future_to_url[future]
                    try:
                        extracted_data = future.result()
                        for item in formatted_results:
                            if item["url"] == url:
                                if use_detailed_scraping or render_javascript:
                                    item["scraped_data"] = extracted_data
                                else:
                                    item["full_text"] = extracted_data.get("extracted_text")
                                    
                                if "error" in extracted_data:
                                    item["scraping_error"] = extracted_data["error"]
                                break
                    except Exception as exc:
                        logging.error(f"URL {url} generated exception: {exc}")
                        for item in formatted_results:
                            if item["url"] == url:
                                item["scraping_error"] = f"Failed: {exc}"
                                break

        return json.dumps(formatted_results, indent=2, ensure_ascii=False)

    except requests.exceptions.HTTPError as http_err:
        logging.error(f"HTTP error during Brave Search: {http_err}")
        return json.dumps({"error": f"HTTP error: {http_err}", "status_code": response.status_code})
    except requests.exceptions.Timeout as timeout_err:
        logging.error(f"Timeout during Brave Search: {timeout_err}")
        return json.dumps({"error": f"Timeout: {timeout_err}"})
    except Exception as e:
        logging.error(f"Unexpected error in brave_search_tool: {e}", exc_info=True)
        return json.dumps({"error": f"Unexpected error: {e}"})


# Example usage
if __name__ == "__main__":
    print("=== Enhanced Brave Search Tool with React/SPA Support ===\n")
    
    # Test 1: Static site (no JS needed)
    print("--- Test 1: Static Site (Wikipedia) ---")
    result1 = brave_search_tool(
        "https://en.wikipedia.org/wiki/Python_(programming_language)",
        use_detailed_scraping=True
    )
    print(f"Result length: {len(result1)} chars")
    print(result1[:500])
    
    # Test 2: React/SPA site WITH JavaScript rendering
    print("\n--- Test 2: React Site WITH Selenium (JS Rendering) ---")
    if SELENIUM_AVAILABLE:
        result2 = brave_search_tool(
            "https://react.dev",
            render_javascript=True,
            use_detailed_scraping=True,
            js_wait_time=5
        )
        print(f"Result length: {len(result2)} chars")
        print(result2[:500])
    else:
        print("Selenium not available. Install: pip install selenium webdriver-manager")
    
    # Test 3: React/SPA site WITHOUT JavaScript rendering (will miss content)
    print("\n--- Test 3: React Site WITHOUT Selenium (Limited Content) ---")
    result3 = brave_search_tool(
        "https://react.dev",
        use_detailed_scraping=True
    )
    print(f"Result length: {len(result3)} chars")
    print(result3[:500])
    
    # Test 4: Search with JS rendering
    print("\n--- Test 4: Search with JS Rendering ---")
    if SELENIUM_AVAILABLE:
        result4 = brave_search_tool(
            "react hooks tutorial",
            num_results=2,
            fetch_full_text=True,
            render_javascript=True,
            use_detailed_scraping=True
        )
        print(f"Result length: {len(result4)} chars")
    
    print("\n=== Tests Complete ===")
