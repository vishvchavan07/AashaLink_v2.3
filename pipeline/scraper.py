import requests
from bs4 import BeautifulSoup
import sqlite3
import datetime
import os

# --- Configuration ---
BASE_URL = "https://nhsrcindia.org"
ASHA_HUB_URL = f"{BASE_URL}/practice-areas/cpc-phc/community-process-asha"
WHATS_NEW_URL = f"{BASE_URL}/whats-new"
DB_PATH = "asha_data.db"

def setup_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            url TEXT UNIQUE,
            category TEXT,
            extracted_at TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            url TEXT UNIQUE,
            published_date TEXT,
            category TEXT,
            summary TEXT
        )
    ''')
    conn.commit()
    return conn

def scrape_asha_hub(conn):
    print("Scraping ASHA Hub...")
    try:
        response = requests.get(ASHA_HUB_URL, timeout=15)
        soup = BeautifulSoup(response.text, 'lxml')
        cursor = conn.cursor()
        
        # Look for PDF links in tables or lists
        links = soup.find_all('a', href=True)
        count = 0
        for link in links:
            href = link['href']
            if href.endswith('.pdf'):
                full_url = href if href.startswith('http') else BASE_URL + href
                title = link.get_text().strip() or os.path.basename(href)
                
                try:
                    cursor.execute('INSERT OR IGNORE INTO documents (title, url, category, extracted_at) VALUES (?, ?, ?, ?)',
                                 (title, full_url, "Guideline", datetime.datetime.now().isoformat()))
                    count += 1
                except Exception as e:
                    print(f"Error inserting doc: {e}")
        
        conn.commit()
        print(f"Added {count} new documents.")
    except Exception as e:
        print(f"Scrape ASHA Hub failed: {e}")

def scrape_whats_new(conn):
    print("Scraping Whats New...")
    try:
        # We can also add ?title=asha to the query if the site supports it
        response = requests.get(WHATS_NEW_URL, timeout=15)
        soup = BeautifulSoup(response.text, 'lxml')
        cursor = conn.cursor()
        
        rows = soup.select('.view-whats-new .views-row')
        count = 0
        for row in rows:
            title_tag = row.select_one('.views-field-title a')
            if not title_tag: continue
            
            title = title_tag.get_text().strip()
            # Filter for ASHA related news
            if "ASHA" in title.upper():
                url = title_tag['href']
                full_url = url if url.startswith('http') else BASE_URL + url
                date_tag = row.select_one('.views-field-created')
                date_str = date_tag.get_text().strip() if date_tag else datetime.datetime.now().strftime("%Y-%m-%d")
                
                try:
                    cursor.execute('INSERT OR IGNORE INTO updates (title, url, published_date, category) VALUES (?, ?, ?, ?)',
                                 (title, full_url, date_str, "Notification"))
                    count += 1
                except Exception as e:
                    print(f"Error inserting update: {e}")
        
        conn.commit()
        print(f"Added {count} new updates.")
    except Exception as e:
        print(f"Scrape Whats New failed: {e}")

if __name__ == "__main__":
    connection = setup_db()
    scrape_asha_hub(connection)
    scrape_whats_new(connection)
    connection.close()
    print("Pipeline Execution Complete.")
