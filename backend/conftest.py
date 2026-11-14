import sys
import os
import pytest
import requests

# Automatically append backend folder to sys.path for test discovery
backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)


def pytest_addoption(parser):
    parser.addoption("--live", action="store_true", help="Include real public-provider checks")


def pytest_configure(config):
    config.addinivalue_line("markers", "live: contacts real public map providers")


def pytest_collection_modifyitems(config, items):
    if config.getoption("--live"):
        return
    for item in items:
        if "live" in item.keywords:
            item.add_marker(pytest.mark.skip(reason="Public-provider check: run with --live"))


@pytest.fixture(autouse=True)
def prevent_accidental_network(request, monkeypatch):
    if request.node.get_closest_marker("live"):
        return

    # Hosted builds can have real provider credentials. Isolated tests must use
    # an unconfigured client unless their own fixture explicitly supplies one.
    from services.geoapify_client import GeoapifyClient
    monkeypatch.delenv('GEOAPIFY_API_KEY', raising=False)
    monkeypatch.setattr('app.geoapify_client', GeoapifyClient())

    def unexpected_request(*args, **kwargs):
        raise AssertionError("Deterministic tests must provide their own HTTP fixture")

    monkeypatch.setattr(requests.sessions.Session, "request", unexpected_request)
