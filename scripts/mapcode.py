"""Convert a Japanese Mapcode to WGS84 latitude/longitude.

Usage: python scripts/mapcode.py "86 816 518*35"
Prints: <lat>,<lon>  (世界測地系 / WGS84, the datum the app uses)
"""
import re
import sys
import urllib.parse
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
code = " ".join(sys.argv[1:]).strip()
if not code:
    sys.exit("usage: mapcode.py <mapcode>")

data = urllib.parse.urlencode({"t": "mapcode", "mapcode": code}).encode()
req = urllib.request.Request(
    "https://saibara.sakura.ne.jp/map/convgeo.cgi",
    data=data,
    headers={"User-Agent": "travel-map-dev"},
)
html = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "replace")
match = re.search(r"世界測地系\s*:\s*(\d+\.\d+)\s*/\s*(\d+\.\d+)", html)
if not match:
    sys.exit(f"no WGS84 coordinates found for mapcode {code!r}")
lat, lon = (round(float(v), 6) for v in match.groups())
print(f"{lat},{lon}")
