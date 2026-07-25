"""
app.py
--------------------------------------------------------------------------
Entry point of the InvestIQ backend.

This is the file you run to start the Flask server. Its job in Phase 1
is intentionally small:
  1. Create the Flask app.
  2. Turn on CORS so the existing HTML/CSS/JS frontend (opened as a
     static file or served from a different port) is allowed to call
     this backend without the browser blocking the request.
  3. Register a single test route, GET /api/test, so we can confirm the
     frontend and backend can actually talk to each other before any
     real features are built.

Nothing about authentication, the database, or business logic lives
here -- as the project grows, routes will move into routes/, database
setup into database/db.py, and app.py will just wire those pieces
together via create_app().
--------------------------------------------------------------------------
"""

from flask import Flask, jsonify
from flask_cors import CORS

from config import Config


def create_app():
    """
    Application factory.

    Building the app inside a function (instead of at the top level of
    this file) is a common Flask pattern -- it makes it easy to create
    multiple instances of the app later (for example, one for running
    the server and one for automated tests) without them interfering
    with each other.
    """
    app = Flask(__name__)

    # Load settings (e.g. DEBUG, SECRET_KEY) from config.py
    app.config.from_object(Config)

    # ----------------------------------------------------------------
    # CORS (Cross-Origin Resource Sharing)
    # ----------------------------------------------------------------
    # The frontend files (index.html, login.html, etc.) are opened from
    # a different "origin" than the Flask server (different port, or a
    # plain file:// path). Browsers block JavaScript `fetch()` calls
    # between different origins unless the server explicitly allows it.
    # CORS(app) turns that permission on for every route, which is the
    # simplest option while everything runs locally on your machine.
    CORS(app)

    # ----------------------------------------------------------------
    # TEST ROUTE
    # ----------------------------------------------------------------
    # A single, dependency-free endpoint whose only purpose is proving
    # the frontend can reach the backend. Real feature routes will be
    # added later inside routes/ and registered here with
    # app.register_blueprint(...) instead of being written directly
    # in app.py.
    @app.route("/api/test", methods=["GET"])
    def test_connection():
        return jsonify({
            "message": "InvestIQ Backend Connected Successfully"
        })

    return app


# This block only runs when you execute `python app.py` directly (not
# when this file is imported elsewhere, e.g. by a test runner).
if __name__ == "__main__":
    app = create_app()
    # debug=True auto-reloads the server when you save a file and shows
    # detailed error pages -- convenient in development, but this
    # should be turned off (via config.py) before any real deployment.
    app.run(debug=True, port=5000)
