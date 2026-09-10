import os
import re
import firebase_admin
import smtplib
from firebase_admin import credentials, firestore
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Email Configuration (Store secrets in .env!)
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "your_gmail@gmail.com")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD", "your_app_password")
MY_NOTIFICATION_EMAIL = "Eivanmartelino@gmail.com"

def send_email_alert(sender_name, sender_email, user_message):
    try:
        subject = f"🔔 Portfolio DM from {sender_name}"
        body = f"""
        You received a new message from your portfolio website!

        Name: {sender_name}
        Email: {sender_email}
        Message:
        ----------------------------------
        {user_message}
        ----------------------------------
        """

        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = MY_NOTIFICATION_EMAIL
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        # Connect to Gmail SMTP Server
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print("Email notification sent successfully!")
    except Exception as e:
        print(f"Failed to send email notification: {e}")

load_dotenv()
SECRET_KEY = os.getenv("MY_SECRET_KEY")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# 1. Setup Rate Limiter (Prevents Spam)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# 2. Initialize Firebase Admin
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# Helper function to sanitize text input
def clean_input(text):
    if not text:
        return ""
    # Strip basic script tags to prevent XSS
    return re.sub(r'<[^>]*>', '', str(text)).strip()


# ==========================================
# MESSAGES / DM ENDPOINTS
# ==========================================

# CREATE: Send DM (Public with Rate Limit)
@app.route('/api/contact', methods=['POST'])
@limiter.limit("5 per hour")
def send_message():
    try:
        data = request.get_json() or {}
        name = clean_input(data.get('name'))
        email = clean_input(data.get('email'))
        message = clean_input(data.get('message'))

        if not name or not email or not message:
            return jsonify({"error": "All fields are required."}), 400

        # 1. Save to Firebase Firestore
        doc_ref = db.collection('messages').add({
            'name': name,
            'email': email,
            'message': message,
            'status': 'unread',
            'timestamp': firestore.SERVER_TIMESTAMP
        })

        # 2. Trigger Real-time Email Alert
        send_email_alert(name, email, message)

        return jsonify({"status": "success", "message": "Message sent successfully!", "id": doc_ref[1].id}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# READ: Fetch all DMs (For Admin View)
@app.route('/api/messages', methods=['GET'])
def get_messages():
    try:
        messages_ref = db.collection('messages').order_by('timestamp', direction=firestore.Query.DESCENDING).stream()
        messages = []
        for doc in messages_ref:
            msg = doc.to_dict()
            msg['id'] = doc.id
            messages.append(msg)
        return jsonify(messages), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# DELETE: Remove a DM by ID
@app.route('/api/messages/<message_id>', methods=['DELETE'])
def delete_message(message_id):
    try:
        db.collection('messages').document(message_id).delete()
        return jsonify({"status": "success", "message": f"Message {message_id} deleted."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================
# PROJECTS CRUD ENDPOINTS
# ==========================================

# READ: Fetch all projects
@app.route('/api/projects', methods=['GET'])
def get_projects():
    try:
        projects_ref = db.collection('projects').stream()
        projects = []
        for doc in projects_ref:
            p = doc.to_dict()
            p['id'] = doc.id
            projects.append(p)
        return jsonify(projects), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# CREATE: Add a new project
@app.route('/api/projects', methods=['POST'])
def create_project():
    try:
        data = request.get_json() or {}
        title = clean_input(data.get('title'))
        tech = clean_input(data.get('tech'))
        description = clean_input(data.get('description'))

        if not title or not tech or not description:
            return jsonify({"error": "Title, tech, and description are required."}), 400

        doc_ref = db.collection('projects').add({
            'title': title,
            'tech': tech,
            'description': description
        })
        return jsonify({"status": "success", "id": doc_ref[1].id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# DELETE A PROJECT
@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    try:
        db.collection('projects').document(project_id).delete()
        return jsonify({"message": "Project deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# EDIT/UPDATE A PROJECT
@app.route('/api/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    try:
        data = request.json
        db.collection('projects').document(project_id).update({
            'title': data.get('title'),
            'tech': data.get('tech'),
            'description': data.get('description')
        })
        return jsonify({"message": "Project updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, port=port)