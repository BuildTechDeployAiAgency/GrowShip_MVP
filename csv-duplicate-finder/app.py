from flask import Flask, render_template, request, send_file, session
import pandas as pd
import os
from io import BytesIO
import uuid
import tempfile

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size
app.config['SECRET_KEY'] = os.urandom(24)  # Required for session

# Create uploads directory if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return "No file part", 400
    
    file = request.files['file']
    if file.filename == '':
        return "No selected file", 400
    
    if file:
        try:
            # Read the CSV file
            df = pd.read_csv(file)
            
            # Identify duplicates across all columns
            duplicates = df[df.duplicated(keep=False)]
            
            # Store duplicates DataFrame in session using a unique ID
            # We'll store the duplicates as a temporary CSV file
            if not duplicates.empty:
                # Generate a unique session ID for this upload
                session_id = str(uuid.uuid4())
                session['session_id'] = session_id
                
                # Save duplicates to a temporary file
                temp_file = os.path.join(app.config['UPLOAD_FOLDER'], f'{session_id}_duplicates.csv')
                duplicates.to_csv(temp_file, index=False)
                session['duplicates_file'] = temp_file
            else:
                session['duplicates_file'] = None
            
            # Store original data count for display
            session['original_count'] = len(df)
            session['duplicate_count'] = len(duplicates) if not duplicates.empty else 0
            
            return render_template('results.html',
                                  original_data=df.to_html(classes='table table-striped', index=False),
                                  duplicate_data=duplicates.to_html(classes='table table-striped', index=False) if not duplicates.empty else None,
                                  has_duplicates=not duplicates.empty,
                                  original_count=len(df),
                                  duplicate_count=len(duplicates) if not duplicates.empty else 0)
        except Exception as e:
            return f"Error processing file: {e}", 500
    
    return "Something went wrong", 500

@app.route('/download_duplicates', methods=['GET'])
def download_duplicates():
    # Check if duplicates file exists in session
    if 'duplicates_file' not in session or session['duplicates_file'] is None:
        return "No duplicates found or session expired. Please upload a file again.", 404
    
    duplicates_file = session['duplicates_file']
    
    # Check if the file still exists
    if not os.path.exists(duplicates_file):
        return "Duplicates file not found. Please upload a file again.", 404
    
    try:
        # Read the duplicates CSV file
        duplicates_df = pd.read_csv(duplicates_file)
        
        # Convert to CSV in memory
        output = BytesIO()
        duplicates_df.to_csv(output, index=False)
        output.seek(0)
        
        # Send the file for download
        return send_file(
            output,
            mimetype='text/csv',
            as_attachment=True,
            download_name='duplicates.csv'
        )
    except Exception as e:
        return f"Error generating download file: {e}", 500

if __name__ == '__main__':
    app.run(debug=True)

