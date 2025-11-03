# CSV Duplicate Finder

A Flask web application that allows users to upload a CSV file, identify duplicate rows based on all columns, and download the duplicates as a separate CSV file.

## Features

- Upload CSV files (up to 16MB)
- Identify duplicate rows across all columns
- Display original data and duplicate rows in a user-friendly interface
- Download duplicates as a CSV file

## Installation

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Run the Flask application:
```bash
python app.py
```

2. Open your browser and navigate to `http://127.0.0.1:5000`

3. Upload a CSV file using the web interface

4. View the results and download duplicates if any are found

## Project Structure

```
csv-duplicate-finder/
├── app.py              # Main Flask application
├── templates/
│   ├── index.html      # Upload page
│   └── results.html    # Results display page
├── uploads/            # Temporary storage for uploaded files (created automatically)
├── requirements.txt    # Python dependencies
└── README.md           # This file
```

## How It Works

1. User uploads a CSV file through the web interface
2. The application reads the CSV using pandas
3. Duplicates are identified using `df.duplicated(keep=False)` which marks all occurrences of duplicate rows
4. Results are displayed on the results page
5. Duplicates are stored temporarily in the session and can be downloaded

## Notes

- The application uses Flask sessions to store duplicate data temporarily
- Temporary files are stored in the `uploads/` directory
- Maximum file size is 16MB (configurable in `app.py`)

