"""Read or clear the queue of stops the planner could not locate.

The planner (src/services/firebase.js, reportUnlocatedPlace) adds a stop's
name to syncSpaces/<trip directory>/appData/unlocatedPlaces whenever the free
maps can't find it. The scheduled job lists them, adds each place to
namedPlaces in src/views/frontend/Planner.jsx, then removes it here.

Usage:
  python scripts/unlocated_places.py list            # JSON: {key: {query, text, attempts}}
  python scripts/unlocated_places.py remove KEY...   # drop places that were added
  python scripts/unlocated_places.py attempt KEY...  # count a failed lookup
  python scripts/unlocated_places.py add "NAME"      # queue a name by hand (testing)

Uses the site's public Firebase web key and an anonymous sign-in, exactly as
the planner page does; no secrets are needed.
"""
import hashlib
import json
import sys
import urllib.parse
import urllib.request

API_KEY = "AIzaSyAglWZlcTSZWxr6ic-aafjAYvYaTzIyYMc"
PROJECT = "travel-map-9c5c2"
DIRECTORY_ID = hashlib.sha256(b"travel-map:__trip-directory__").hexdigest()
DOC_URL = (
    f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/"
    f"syncSpaces/{DIRECTORY_ID}/appData/unlocatedPlaces"
)

sys.stdout.reconfigure(encoding="utf-8")


def request(url, method="GET", body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode() or "{}")
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise SystemExit(f"{method} {url} -> {error.code}: {error.read().decode()[:300]}")


def sign_in():
    result = request(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}",
        "POST",
        {"returnSecureToken": True},
    )
    return result["idToken"]


def read_places(token):
    document = request(DOC_URL, token=token)
    if not document:
        return {}
    fields = document.get("fields", {}).get("places", {}).get("mapValue", {}).get("fields", {})
    places = {}
    for key, value in fields.items():
        entry = value.get("mapValue", {}).get("fields", {})
        places[key] = {
            "query": entry.get("query", {}).get("stringValue", ""),
            "text": entry.get("text", {}).get("stringValue", ""),
            "attempts": int(entry.get("attempts", {}).get("integerValue", 0)),
        }
    return places


def patch(token, keys, fields):
    mask = "&".join(
        "updateMask.fieldPaths=" + urllib.parse.quote(f"places.`{key}`") for key in keys
    )
    request(f"{DOC_URL}?{mask}", "PATCH", {"fields": fields}, token)


def main():
    command, *args = sys.argv[1:] or ["list"]
    token = sign_in()
    if command == "list":
        print(json.dumps(read_places(token), ensure_ascii=False, indent=2))
    elif command == "remove" and args:
        # Keys in the mask but missing from the body are deleted.
        patch(token, args, {})
        print(f"removed {len(args)}")
    elif command == "attempt" and args:
        places = read_places(token)
        entries = {
            key: {
                "mapValue": {
                    "fields": {
                        "query": {"stringValue": places[key]["query"]},
                        "text": {"stringValue": places[key]["text"]},
                        "attempts": {"integerValue": str(places[key]["attempts"] + 1)},
                    }
                }
            }
            for key in args
            if key in places
        }
        patch(token, list(entries), {"places": {"mapValue": {"fields": entries}}})
        print(f"counted {len(entries)}")
    elif command == "add" and args:
        query = args[0]
        key = hashlib.sha256(query.encode()).hexdigest()[:16]
        patch(
            token,
            [key],
            {
                "places": {
                    "mapValue": {
                        "fields": {
                            key: {
                                "mapValue": {
                                    "fields": {
                                        "query": {"stringValue": query},
                                        "text": {"stringValue": query},
                                    }
                                }
                            }
                        }
                    }
                }
            },
        )
        print(key)
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
