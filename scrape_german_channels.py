# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "requests",
#   "beautifulsoup4",
# ]
# ///
import requests
import re

from bs4 import BeautifulSoup


url = "https://epg.pw/areas/de.html?lang=en"
resp = requests.get(url)
soup = BeautifulSoup(resp.text, "html.parser")

channels = []
for a in soup.find_all("a", href=True):
    m = re.match(r"/last/(\d+)\.html", a["href"])
    if m:
        epgId = int(m.group(1))
        name = a.text.strip()
        # Generate a simple id: lowercase, alphanum and dash only
        id_ = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        channels.append({'id': id_, 'name': name, 'epgId': epgId})

# Output for germanChannels.js
print("const germanChannels = [")
for ch in channels:
    print(f"    {{ id: '{ch['id']}', name: '{ch['name']}', epgId: {ch['epgId']} }},")
print("];")
