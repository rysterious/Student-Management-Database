import os
import uuid
from datetime import datetime, timedelta
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
        if hasattr(res, 'error') and res.error: # type: ignore
            raise Exception(f"Storage upload error: {res.error}") # type: ignore
            
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
            "student_id": request.form.get("student_id"),  # Added student_id field
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
        if hasattr(response, 'error') and response.error: # type: ignore
            return jsonify({"success": False, "error": str(response.error)}), 500 # type: ignore
            
        # After successfully adding student, add them to unpaid fees table
        if data["student_id"] and data["name"]:
            unpaid_response = supabase.table("fees_unpaid").insert({
                "student_id": data["student_id"],
                "name": data["name"],
                "amount": 0  # Default amount, can be changed later
            }).execute()
            
            if hasattr(unpaid_response, 'error') and unpaid_response.error: # type: ignore
                print(f"Failed to add student to unpaid fees: {unpaid_response.error}") # type: ignore
        
        return jsonify({"success": True, "data": response.data}), 201
        
    except Exception as e:
        app.logger.exception("Error submitting form")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Endpoint to test Supabase connection"""
    try:
        # Try a simple query
        response = supabase.table('students').select("count", count="exact").execute() # pyright: ignore[reportArgumentType]
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
        
        # Also remove from all fees tables
        supabase.table("fees_unpaid").delete().eq("student_id", student_id).execute()
        supabase.table("fees_paid").delete().eq("student_id", student_id).execute()
        supabase.table("fees_overdue").delete().eq("student_id", student_id).execute()
        
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
        
        if hasattr(response, 'error') and response.error:   # pyright: ignore[reportAttributeAccessIssue]
            return jsonify({"error": str(response.error)}), 500  # pyright: ignore[reportAttributeAccessIssue]
            
        # If student name was updated, update in all fees tables as well
        if "name" in data:
            supabase.table("fees_unpaid").update({"name": data["name"]}).eq("student_id", student_id).execute()
            supabase.table("fees_paid").update({"name": data["name"]}).eq("student_id", student_id).execute()
            supabase.table("fees_overdue").update({"name": data["name"]}).eq("student_id", student_id).execute()
            
        return jsonify({"success": True, "data": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================
# Fees Management Routes (Properly separated tables)
# ======================

@app.route("/fees/unpaid", methods=["GET"])
def get_fees_unpaid():
    response = supabase.table("fees_unpaid").select("*").execute()
    return jsonify(response.data)

@app.route("/fees/paid", methods=["GET"])
def get_fees_paid():
    response = supabase.table("fees_paid").select("*").execute()
    return jsonify(response.data)

@app.route("/fees/overdue", methods=["GET"])
def get_fees_overdue():
    response = supabase.table("fees_overdue").select("*").execute()
    return jsonify(response.data)

@app.route("/fees/pay", methods=["POST"])
def mark_fee_paid():
    """Move student from unpaid/overdue → paid"""
    try:
        data = request.get_json()
        student_id = data["student_id"]
        amount = data["amount"]
        
        # Get student name
        student_response = supabase.table("students").select("name").eq("student_id", student_id).execute()
        if not student_response.data:
            return jsonify({"error": "Student not found"}), 404
            
        student_name = student_response.data[0]["name"]
        
        # Check if student exists in unpaid table
        unpaid_response = supabase.table("fees_unpaid").select("*").eq("student_id", student_id).execute()
        if unpaid_response.data:
            # Remove from unpaid
            supabase.table("fees_unpaid").delete().eq("student_id", student_id).execute()
        
        # Check if student exists in overdue table
        overdue_response = supabase.table("fees_overdue").select("*").eq("student_id", student_id).execute()
        if overdue_response.data:
            # Remove from overdue
            supabase.table("fees_overdue").delete().eq("student_id", student_id).execute()
        
        # Insert into paid with current date
        paid_response = supabase.table("fees_paid").insert({
            "student_id": student_id,
            "name": student_name,
            "amount": amount,
            "date": datetime.now().strftime("%Y-%m-%d")
        }).execute()
        
        if hasattr(paid_response, 'error') and paid_response.error: # type: ignore
            return jsonify({"error": str(paid_response.error)}), 500 # type: ignore
            
        return jsonify({"success": True})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/fees/move_overdue", methods=["POST"])
def move_to_overdue():
    """Move unpaid → overdue"""
    try:
        data = request.get_json()
        student_id = data["student_id"]
        amount = data["amount"]
        
        # Get student name
        student_response = supabase.table("students").select("name").eq("student_id", student_id).execute()
        if not student_response.data:
            return jsonify({"error": "Student not found"}), 404
            
        student_name = student_response.data[0]["name"]
        
        # Remove from unpaid
        supabase.table("fees_unpaid").delete().eq("student_id", student_id).execute()
        
        # Insert into overdue
        overdue_response = supabase.table("fees_overdue").insert({
            "student_id": student_id,
            "name": student_name,
            "amount": amount
        }).execute()
        
        if hasattr(overdue_response, 'error') and overdue_response.error: # type: ignore
            return jsonify({"error": str(overdue_response.error)}), 500 # type: ignore
            
        return jsonify({"success": True})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/fees/check_overdue", methods=["POST"])
def check_overdue_fees():
    """Check for unpaid fees that are over 30 days old and move them to overdue"""
    try:
        # Get all unpaid fees
        unpaid_response = supabase.table("fees_unpaid").select("*").execute()
        unpaid_fees = unpaid_response.data
        
        # Current date
        current_date = datetime.now()
        moved_count = 0
        
        for fee in unpaid_fees:
            # Check if fee has a date field and is over 30 days old
            if "date" in fee and fee["date"]:
                try:
                    fee_date = datetime.strptime(fee["date"], "%Y-%m-%d")
                    if (current_date - fee_date).days > 30:
                        # Move to overdue
                        move_data = {
                            "student_id": fee["student_id"],
                            "amount": fee["amount"]
                        }
                        # Call the move_to_overdue function
                        move_response = supabase.table("fees_overdue").insert({
                            "student_id": fee["student_id"],
                            "name": fee.get("name", "Unknown"),
                            "amount": fee["amount"]
                        }).execute()
                        
                        if not (hasattr(move_response, 'error') and move_response.error): # type: ignore
                            # Remove from unpaid if successfully moved to overdue
                            supabase.table("fees_unpaid").delete().eq("student_id", fee["student_id"]).execute()
                            moved_count += 1
                except ValueError:
                    # Skip if date format is invalid
                    continue
        
        return jsonify({"success": True, "message": f"Moved {moved_count} fees to overdue"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/fees/all", methods=["GET"])
def get_all_fees_status():
    try:
        # Get all students
        students = supabase.table("students").select("*").execute().data

        # Fetch fees data from all tables
        paid = supabase.table("fees_paid").select("*").execute().data
        unpaid = supabase.table("fees_unpaid").select("*").execute().data
        overdue = supabase.table("fees_overdue").select("*").execute().data

        result = []
        for s in students:
            status = "unpaid"  # Default status
            amount = None
            last_date = None

            # Check if student is in any fees table (priority: overdue > paid > unpaid)
            overdue_entry = next((f for f in overdue if f["student_id"] == s["student_id"]), None)
            paid_entry = next((f for f in paid if f["student_id"] == s["student_id"]), None)
            unpaid_entry = next((f for f in unpaid if f["student_id"] == s["student_id"]), None)
            
            if overdue_entry:
                status = "overdue"
                amount = overdue_entry.get("amount")
            elif paid_entry:
                status = "paid"
                amount = paid_entry.get("amount")
                last_date = paid_entry.get("date")
            elif unpaid_entry:
                status = "unpaid"
                amount = unpaid_entry.get("amount")

            result.append({
                "id": s["id"],
                "student_id": s["student_id"],
                "name": s["name"],
                "course": s["course"],
                "status": status,
                "amount": amount,
                "last_date": last_date
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/fees/add", methods=["POST"])
def add_fee_entry():
    """Manually add a fee record for a student"""
    try:
        data = request.get_json()
        student_id = data.get("student_id")
        amount = data.get("amount")
        status = data.get("status", "unpaid")
        date = data.get("date")
        
        # Get student name
        student_response = supabase.table("students").select("name").eq("student_id", student_id).execute()
        if not student_response.data:
            return jsonify({"error": "Student not found"}), 404
            
        student_name = student_response.data[0]["name"]
        
        # Remove from other tables first to avoid duplicates
        if status != "unpaid":
            supabase.table("fees_unpaid").delete().eq("student_id", student_id).execute()
        if status != "paid":
            supabase.table("fees_paid").delete().eq("student_id", student_id).execute()
        if status != "overdue":
            supabase.table("fees_overdue").delete().eq("student_id", student_id).execute()
        
        # Add to appropriate table
        if status == "paid":
            response = supabase.table("fees_paid").insert({
                "student_id": student_id,
                "name": student_name,
                "amount": amount,
                "date": date or datetime.now().strftime("%Y-%m-%d")
            }).execute()
        elif status == "unpaid":
            # Don't include date for unpaid fees (as fees_unpaid table doesn't have date column)
            response = supabase.table("fees_unpaid").insert({
                "student_id": student_id,
                "name": student_name,
                "amount": amount
            }).execute()
        elif status == "overdue":
            response = supabase.table("fees_overdue").insert({
                "student_id": student_id,
                "name": student_name,
                "amount": amount
            }).execute()
        else:
            return jsonify({"error": "Invalid status"}), 400

        if hasattr(response, 'error') and response.error: # type: ignore
            return jsonify({"error": str(response.error)}), 500 # type: ignore
            
        return jsonify({"success": True})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)