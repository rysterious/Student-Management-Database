import os
import uuid
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration for self-hosted Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://localhost:8000")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")  # No default - should be set in .env
BUCKET = os.environ.get("SUPABASE_BUCKET", "student-photos")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY environment variable is required")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_to_storage(file_path: str, storage_path: str) -> str:
    """
    Upload file to self-hosted Supabase Storage
    """
    try:
        with open(file_path, 'rb') as f:
            # Upload the file
            res = supabase.storage.from_(BUCKET).upload(
                path=storage_path,
                file=f
            )
        
        # Check for errors
        if hasattr(res, 'error') and res.error:
            raise Exception(f"Storage upload error: {res.error}")
            
        # Get public URL for self-hosted Supabase
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
        return public_url
        
    except Exception as e:
        raise Exception(f"Failed to upload to storage: {str(e)}")

@app.route("/submit", methods=["POST"])
def submit():
    try:
        # Collect form data
        data = {
            "name": request.form.get("name"),
            "father_name": request.form.get("father_name"),
            "gender": request.form.get("gender"),
            "email": request.form.get("email"),
            "phone": request.form.get("phone"),
            "phone2": request.form.get("phone2"),
            "emergency_contact": request.form.get("emergency_contact"),
            "dob": request.form.get("dob"),
            "address": request.form.get("address"),
            "course": request.form.get("course"),
        }

        # Handle file upload
        profile_file = request.files.get("profile_pic")
        if profile_file and profile_file.filename:
            # Create unique filename
            file_ext = os.path.splitext(profile_file.filename)[1] or '.jpg'
            unique_filename = f"{uuid.uuid4().hex}{file_ext}"
            storage_path = f"students/{unique_filename}"
            
            # Save file temporarily
            temp_dir = "temp_uploads"
            os.makedirs(temp_dir, exist_ok=True)
            temp_path = os.path.join(temp_dir, unique_filename)
            profile_file.save(temp_path)
            
            try:
                # Upload to Supabase Storage
                public_url = upload_to_storage(temp_path, storage_path)
                data["profile_pic_url"] = public_url
                print(f"Uploaded image to: {public_url}")
            except Exception as upload_error:
                print(f"Upload failed: {upload_error}")
                # Continue without image rather than failing completely
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
        
        # Insert data into Supabase table
        response = supabase.table("students").insert(data).execute()
        
        # Check for errors
        if hasattr(response, 'error') and response.error:
            return jsonify({"success": False, "error": str(response.error)}), 500
            
        return jsonify({"success": True, "data": response.data}), 201
        
    except Exception as e:
        app.logger.exception("Error submitting form")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Endpoint to test Supabase connection"""
    try:
        # Try a simple query
        response = supabase.table('students').select("count", count="exact").execute()
        return jsonify({
            "status": "healthy", 
            "supabase_connected": True,
            "students_count": response.count
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "supabase_connected": False,
            "error": str(e)
        }), 500

@app.route("/students", methods=["GET"])
def get_students():
    try:
        # Fetch all students from Supabase
        response = supabase.table("students").select("*").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/students/<student_id>", methods=["DELETE"])
def delete_student(student_id):
    try:
        # Delete student from Supabase
        response = supabase.table("students").delete().eq("id", student_id).execute()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/students/<student_id>", methods=["PUT"])
def update_student(student_id):
    try:
        # Get JSON data from request
        data = request.get_json()
        
        # Update student in Supabase
        response = supabase.table("students").update(data).eq("id", student_id).execute()
        
        if hasattr(response, 'error') and response.error:
            return jsonify({"error": str(response.error)}), 500
            
        return jsonify({"success": True, "data": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)