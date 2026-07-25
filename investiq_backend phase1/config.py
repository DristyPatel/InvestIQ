"""
config.py
--------------------------------------------------------------------------
Central place for application configuration.

Right now this only holds a couple of basic Flask settings, but the
idea is that as the project grows, every setting that might change
between environments (your laptop vs. a real server) or between phases
(no database today, SQLite tomorrow) gets defined here instead of
being scattered across route files. That keeps secrets and environment
-specific values out of the actual application logic.

Nothing here is wired to a database yet -- DATABASE_URI is just a
placeholder comment showing where that will go in the next phase.
--------------------------------------------------------------------------
"""

import os


class Config:
    # SECRET_KEY is used by Flask to sign session cookies and other
    # security-related data. A hardcoded fallback is fine for local
    # development, but in a real deployment this should always come
    # from an environment variable so it isn't stored in source control.
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-later")

    # Turns on Flask's debug mode (auto-reload + detailed error pages).
    # Kept here (instead of hardcoded in app.py) so it can be switched
    # off with an environment variable when this app is ever deployed.
    DEBUG = os.environ.get("FLASK_DEBUG", "True") == "True"

    # ------------------------------------------------------------
    # FUTURE: DATABASE CONFIGURATION (Phase 2)
    # ------------------------------------------------------------
    # When SQLite + SQLAlchemy are introduced, the connection string
    # will be defined here, e.g.:
    #
    # SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, "investiq.db")
    # SQLALCHEMY_TRACK_MODIFICATIONS = False
    #
    # database/db.py will then read this value to connect.
