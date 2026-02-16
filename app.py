# app.py — The Flask web server for our cooking timer app.
#
# Flask is a "micro web framework" — it lets us create a website
# with just a few lines of Python. It handles turning our Python code
# into something a web browser can display.

# Import the Flask class from the flask package.
# 'render_template' lets us serve an HTML file instead of raw text.
import os
from flask import Flask, render_template
from dotenv import load_dotenv

# Load environment variables from .env file.
# This reads the .env file and makes its values available via os.environ.
# In production (e.g. Vercel), the env vars are set directly in the dashboard,
# so load_dotenv() simply finds nothing extra to load — no .env file needed there.
load_dotenv()

# Create our Flask application.
# __name__ tells Flask where to find our files (templates, static, etc.)
app = Flask(__name__)


# A "route" connects a URL to a Python function.
# @app.route("/") means: when someone visits the homepage (http://localhost:5000/),
# run the function below and send back whatever it returns.
@app.route("/")
def home():
    # render_template finds "index.html" inside our templates/ folder
    # and sends it to the browser.
    # We pass the API key from our environment variable so the template
    # can use it without the key being hardcoded in the HTML file.
    return render_template("index.html",
                           firebase_api_key=os.environ.get("FIREBASE_API_KEY"))


# This block runs only when you execute "python app.py" directly.
# It starts the development server on port 5000.
# debug=True means the server auto-restarts when you change code.
if __name__ == "__main__":
    app.run(debug=True)
