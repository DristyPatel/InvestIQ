"""
database/db.py
--------------------------------------------------------------------------
Placeholder for the database connection.

This file intentionally does nothing yet. It exists now so the folder
structure (and the import path `database.db`) is already in place when
the database is introduced, instead of restructuring the project later.

FUTURE (Phase 2), this file will:
  1. Create a single SQLAlchemy instance:

         from flask_sqlalchemy import SQLAlchemy
         db = SQLAlchemy()

  2. Be initialized against the Flask app inside create_app() in
     app.py, with something like:

         from database.db import db
         db.init_app(app)

  3. Be imported by every file in models/ (e.g. models/user.py) so
     each model can define its table using the same `db` instance:

         from database.db import db

         class User(db.Model):
             id = db.Column(db.Integer, primary_key=True)
             ...

Keeping the SQLAlchemy instance in its own small file like this (rather
than creating it directly inside app.py) avoids a common Flask problem
called "circular imports" -- models need to import `db`, and app.py
needs to import the models, so `db` has to live somewhere both sides
can reach without importing each other directly.
--------------------------------------------------------------------------
"""

# No code yet -- SQLAlchemy will be added here in Phase 2.
