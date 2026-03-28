"""HTML email parser — extracts structured data from competitor emails."""

from bs4 import BeautifulSoup
import re
from typing import Optional


def parse_email(html: str) -> dict:
    """Parse an HTML email into structured text and metadata."""
    soup = BeautifulSoup(html, "lxml")

    # Remove style and script tags
    for tag in soup(["style", "script", "meta", "link"]):
        tag.decompose()

    # Extract text
    text = soup.get_text(separator=" ", strip=True)
    text = re.sub(r"\s+", " ", text).strip()

    # Extract CTAs (buttons and prominent links)
    ctas = []
    for link in soup.find_all("a", href=True):
        link_text = link.get_text(strip=True)
        if link_text and len(link_text) > 2 and len(link_text) < 100:
            ctas.append({"text": link_text, "url": link["href"]})

    # Extract images
    images = []
    for img in soup.find_all("img", src=True):
        alt = img.get("alt", "")
        images.append({"src": img["src"], "alt": alt})

    return {
        "text": text,
        "ctas": ctas[:10],  # cap at 10
        "images": images[:20],  # cap at 20
        "word_count": len(text.split()),
    }


def classify_email_type(text: str, subject: str = "") -> str:
    """Classify email type based on content keywords."""
    combined = f"{subject} {text}".lower()

    if any(kw in combined for kw in ["just listed", "new listing", "price drop", "price reduced"]):
        return "new_listing_alert"
    if any(kw in combined for kw in ["market update", "market report", "market pulse", "market data"]):
        return "market_update"
    if any(kw in combined for kw in ["just sold", "sold for", "sale price"]):
        return "just_sold"
    if any(kw in combined for kw in ["open house", "open home", "come visit"]):
        return "open_house_invite"
    if any(kw in combined for kw in ["neighbourhood", "neighborhood", "area guide", "local guide"]):
        return "neighbourhood_guide"
    if any(kw in combined for kw in ["anniversary", "years ago", "home value"]):
        return "home_anniversary"
    if any(kw in combined for kw in ["seller guide", "selling tips", "listing tips"]):
        return "seller_tips"
    if any(kw in combined for kw in ["buyer guide", "buying tips", "first-time"]):
        return "buyer_tips"

    return "general"


def extract_design_patterns(html: str) -> dict:
    """Extract design patterns from HTML email for competitive analysis."""
    soup = BeautifulSoup(html, "lxml")

    patterns = {
        "has_hero_image": False,
        "has_card_grid": False,
        "has_stats_bar": False,
        "has_cta_button": False,
        "has_social_links": False,
        "has_unsubscribe": False,
        "color_scheme": [],
        "layout_type": "unknown",
    }

    # Hero image: first large image or image in header
    first_img = soup.find("img")
    if first_img:
        width = first_img.get("width", "")
        if width and int(re.sub(r"\D", "", width) or 0) > 400:
            patterns["has_hero_image"] = True

    # Card grid: multiple similar table cells or divs
    tables = soup.find_all("table")
    if len(tables) > 3:
        patterns["has_card_grid"] = True

    # Stats bar: numbers with labels
    text = soup.get_text()
    stat_pattern = re.findall(r"\d+[%+]?\s*(?:homes?|days?|sales?|increase|decrease)", text, re.I)
    if len(stat_pattern) >= 2:
        patterns["has_stats_bar"] = True

    # CTA button
    for tag in soup.find_all(["a", "button"]):
        style = tag.get("style", "")
        if "background" in style or "btn" in (tag.get("class") or []):
            patterns["has_cta_button"] = True
            break

    # Social links
    social_domains = ["facebook", "instagram", "twitter", "linkedin", "youtube"]
    for link in soup.find_all("a", href=True):
        if any(s in link["href"].lower() for s in social_domains):
            patterns["has_social_links"] = True
            break

    # Unsubscribe
    for link in soup.find_all("a", href=True):
        if "unsubscribe" in (link.get_text() + link["href"]).lower():
            patterns["has_unsubscribe"] = True
            break

    # Extract colors from inline styles
    colors = set()
    for tag in soup.find_all(style=True):
        color_matches = re.findall(r"#[0-9a-fA-F]{3,6}", tag["style"])
        colors.update(color_matches)
    patterns["color_scheme"] = list(colors)[:10]

    return patterns
