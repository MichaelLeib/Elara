#!/usr/bin/env python3
"""
Test script for domain extraction from DuckDuckGo URLs
"""

from urllib.parse import urlparse, parse_qs, unquote


def test_domain_extraction():
    """Test domain extraction from various URL formats"""

    test_urls = [
        "//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.accuweather.com%2Fen%2Fde%2Fberlin%2F10178%2Fweather%2Dforecast%2F178087&rut=c21f0ad16f8ce5ffecbef0f6372a17e2838ed1be56ebf7cb859e10e327503b54",
        "//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.weather%2Datlas.com%2Fen%2Fgermany%2Fberlin&rut=6e16064e2f1b32e3fdeb55db618ea3f2a8f651a22dfb411079ec24fa2cf2a5b0",
        "https://www.example.com/path",
        "//example.com/path",
        "http://www.test.com/query?param=value",
    ]

    for url in test_urls:
        print(f"\nTesting URL: {url}")
        try:
            # Handle DuckDuckGo redirect URLs
            if url.startswith("//duckduckgo.com/l/?uddg="):
                # Extract the encoded URL from the uddg parameter
                if "?" in url:
                    # Find the uddg parameter manually
                    if "uddg=" in url:
                        start = url.find("uddg=") + 5
                        end = url.find("&", start)
                        if end == -1:
                            end = len(url)
                        encoded_url = url[start:end]
                        decoded_url = unquote(encoded_url)
                        parsed_url = urlparse(decoded_url)
                        domain = parsed_url.netloc
                        print(f"  Decoded URL: {decoded_url}")
                        print(f"  Extracted domain: {domain}")
                    else:
                        domain = "duckduckgo.com"
                        print(f"  No uddg parameter found, using: {domain}")
                else:
                    domain = "duckduckgo.com"
                    print(f"  No query parameters, using: {domain}")
            # Handle protocol-relative URLs (starting with //)
            elif url.startswith("//"):
                domain = url[2:].split("/")[0]
                print(f"  Protocol-relative URL, extracted domain: {domain}")
            else:
                parsed_url = urlparse(url)
                domain = parsed_url.netloc
                print(f"  Regular URL, extracted domain: {domain}")

        except Exception as e:
            print(f"  Error: {e}")


if __name__ == "__main__":
    test_domain_extraction()
