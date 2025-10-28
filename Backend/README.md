# Growship AI FastAPI - Data Extractor with AI-Powered Column Mapping

A FastAPI application that provides intelligent data extraction from Excel/CSV files using OpenAI's GPT-4 model for automatic column mapping and Supabase for data storage.

## 🎯 Key Features

### 1. Excel/CSV File Processing

- Upload and process Excel files (.xlsx, .xls) and CSV files
- Automatic multi-sheet detection with intelligent scoring
- Detects the best sheet containing sales data
- Automatic header detection for files with unnamed columns
- Support for various file encodings (UTF-8, Latin-1, CP1252, ISO-8859-1)
- Data cleaning and validation with null handling
- File statistics and debugging tools

### 2. AI-Powered Column Mapping

- **OpenAI GPT-4 Integration**: Uses advanced AI to analyze data structure and map columns intelligently
- **Automatic Mapping**: Sends sample data (configurable, default 50 rows) to OpenAI for accurate column mapping
- **Smart Detection**: Automatically detects and maps to required standardized format:
  - Product Name / Category
  - Country
  - Year
  - Month
  - Sales Count
  - Sales Value (USD)
  - SOH (Stock on Hand)
  - Description
  - Type
- **Fallback Mechanism**: Gracefully falls back to keyword-based mapping if OpenAI is unavailable
- **Mapping Validation**: Validates mapping quality and provides detailed feedback
- **Data Cleaning**: Handles month normalization (both numeric and text), data type conversion, and null value handling

### 3. Supabase Data Storage

- **Background File Storage**: Uploads files to Supabase storage in the background
- **Document Metadata Tracking**: Tracks document processing status (processing, success, failed)
- **Duplicate Detection**: Prevents duplicate uploads with status tracking
- **Retry Mechanism**: Automatically retries failed uploads
- **User Tables**: Creates user-specific tables for storing mapped data
- **Organization Views**: Creates materialized views for organization-level data aggregation
- **Batch Insert**: Efficiently stores large datasets in batches of 1000 records
- **Document Management**: Upload, track, and delete documents with associated data

### 4. Business Intelligence Functions

- **Top Products by Sales**: Get top-selling products with total sales and counts
- **Sales by Country**: Aggregate sales data by country
- **Monthly Sales Trends**: Track sales trends over time with year filtering
- **Category Performance**: Analyze performance by product category
- **Materialized Views**: Efficient data aggregation for fast queries

### 5. Data Access & Retrieval

- **Pagination Support**: Efficient data retrieval with configurable limits and offsets
- **Filtering**: Filter data by any column with flexible conditions
- **User Data Access**: Users can retrieve their own data
- **Admin Data Access**: Admins can view all organization data through materialized views
- **Data Statistics**: Get summary statistics for numeric columns

## 📋 API Endpoints

### File Upload & Management

- `POST /api/v1/excel/upload` - Upload Excel/CSV file and get sheet names
- `POST /api/v1/excel/upload-and-process` - Upload file, process with AI, and store to Supabase
- `DELETE /api/v1/excel/document/{document_id}` - Delete document and associated data
- `GET /api/v1/excel/sheets/{filename}` - Get all sheet names from uploaded file

### Data Access

- `GET /api/v1/excel/data/{filename}/{sheet_name}` - Get raw data with pagination
- `POST /api/v1/excel/data/{filename}/{sheet_name}/filter` - Filter data with conditions
- `GET /api/v1/excel/stats/{filename}` - Get file statistics for all sheets

### AI Column Mapping

- `POST /api/v1/excel/map-columns/{filename}` - Map columns using OpenAI
- `GET /api/v1/excel/mapped-data/{filename}` - Get mapped data with pagination
- `GET /api/v1/excel/mapped-data-summary/{filename}` - Get summary statistics for mapped data

### Sheet Detection

- `GET /api/v1/excel/detect-best-sheet/{filename}` - Auto-detect best sheet for analysis
- `GET /api/v1/excel/debug/{filename}` - Debug file structure and data

### Supabase Data Retrieval

- `GET /api/v1/excel/data/{organization_id}/{user_id}` - Get user's sales data (paginated)
- `GET /api/v1/excel/admin/data/{organization_id}` - Get all organization data (admin view)

### Business Intelligence Queries

- `GET /api/v1/excel/business-questions/top-products` - Top products by sales
- `GET /api/v1/excel/business-questions/sales-by-country` - Sales aggregated by country
- `GET /api/v1/excel/business-questions/monthly-trend` - Monthly sales trends
- `GET /api/v1/excel/business-questions/category-performance` - Category performance metrics

## 🚀 Setup & Installation

### Prerequisites

- Python 3.10+
- OpenAI API key
- Supabase account with URL and anon key

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Growship_ai_fastapi
   ```

2. **Create virtual environment (optional but recommended)**

   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On Mac/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**

   Create a `.env` file in the project root:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key

   # Optional: Proxy configuration
   HTTP_PROXY=your_proxy_url
   HTTPS_PROXY=your_proxy_url
   ```

5. **Run the server**

   ```bash
   python run.py
   ```

   Or using uvicorn directly:

   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`

## 📖 Usage Examples

### 1. Upload and Process File

```bash
curl -X POST "http://localhost:8000/api/v1/excel/upload-and-process" \
  -F "file=@sales_data.xlsx" \
  -F "user_id=user-123" \
  -F "organization_id=org-456" \
  -F "sheet_name=Raw" \
  -F "sample_size=50"
```

**Response:**

```json
{
  "filename": "sales_data.xlsx",
  "sheet_used": "Raw",
  "mapping": {
    "Product Name": "Item Description",
    "Country": "Country",
    "Year": "Year",
    "Sales Count": "Quantity",
    "Sales Value (usd)": "Sales Value (USD)",
    ...
  },
  "validation": {
    "mapping_quality": "excellent",
    "successful_mappings": 9
  },
  "data_stored": true,
  "total_rows": 1250,
  "document_id": "uuid-here",
  "status": "processing"
}
```

### 2. Get Mapped Data

```bash
curl "http://localhost:8000/api/v1/excel/mapped-data/sales_data.xlsx?limit=10&offset=0"
```

### 3. Get Top Products

```bash
curl "http://localhost:8000/api/v1/excel/business-questions/top-products?organization_id=org-456&user_id=user-123&limit=10"
```

### 4. Get User Data

```bash
curl "http://localhost:8000/api/v1/excel/data/org-456/user-123?limit=100&offset=0"
```

### 5. Delete Document

```bash
curl -X DELETE "http://localhost:8000/api/v1/excel/document/uuid-here?user_id=user-123&organization_id=org-456"
```

## 🏗️ Architecture

### Data Flow

1. **Upload**: User uploads Excel/CSV file
2. **Detection**: System auto-detects best sheet using scoring algorithm
3. **AI Mapping**: Sample data sent to OpenAI GPT-4 for intelligent column mapping
4. **Transformation**: Data is transformed using AI-generated mapping
5. **Storage**:
   - Mapped data stored in user-specific Supabase table
   - File uploaded to Supabase storage (background process)
   - Materialized view created/updated for organization
6. **Access**: Data accessible via user data endpoint or business intelligence queries

### Key Components

#### Excel Processor (`app/utils/excel_processor.py`)

- File reading and parsing
- Header detection and data cleaning
- Sheet detection with intelligent scoring
- Safe file cleanup with retry mechanism

#### OpenAI Mapper (`app/utils/openai_mapper.py`)

- GPT-4 integration for column mapping
- Prompt engineering for accurate mappings
- Validation and fallback mechanisms

#### Supabase Service (`app/services/supabase_service.py`)

- Database operations
- File storage management
- Materialized view management
- Business function execution
- Document lifecycle management

## 🔧 Configuration

### Sample Size Configuration

Control how much data is sent to OpenAI (default: 50 rows):

```python
sample_size: int = Form(50)  # Range: 10-100
```

### Batch Size Configuration

Configure batch insert size for Supabase (default: 1000 records per batch)

### Pagination Limits

- Default limit: 100 records
- Max limit: 10,000 records per request
- User data limit: 1,000 records per request

## 🛡️ Error Handling

- **File Type Validation**: Only allows .xlsx, .xls, .csv files
- **OpenAI Errors**: Falls back to keyword-based mapping
- **Supabase Errors**: Returns detailed error messages with status tracking
- **Duplicate Detection**: Prevents duplicate uploads with status checking
- **File Locking**: Retry mechanism for file cleanup operations
- **Data Validation**: Type conversion and null handling

## 📝 Environment Variables

| Variable            | Description              | Required |
| ------------------- | ------------------------ | -------- |
| `OPENAI_API_KEY`    | OpenAI API key for GPT-4 | Yes      |
| `SUPABASE_URL`      | Supabase project URL     | Yes      |
| `SUPABASE_ANON_KEY` | Supabase anonymous key   | Yes      |
| `HTTP_PROXY`        | HTTP proxy URL           | No       |
| `HTTPS_PROXY`       | HTTPS proxy URL          | No       |

## 🔍 Debug Endpoints

- `GET /debug/supabase` - Check Supabase configuration
- `GET /cors-info` - Check CORS configuration
- `GET /api/v1/excel/debug/{filename}` - Debug file structure
- `GET /health` - Health check endpoint

## 📊 Data Format

### Standardized Columns

The system maps all data to these columns:

- **Product Name**: Category or product name
- **Country**: Country name
- **Year**: Year (integer)
- **Month**: Month (1-12)
- **Sales Count**: Quantity/volume
- **Sales Value (usd)**: Sales value in USD
- **SOH**: Stock on Hand
- **Description**: Product description
- **Type**: Product type/category

## 🎯 Best Practices

1. **Sample Size**: Use 50-100 samples for best AI mapping accuracy
2. **File Size**: Break large files into smaller chunks for better performance
3. **Sheet Selection**: Let the system auto-detect the best sheet
4. **Error Handling**: Check response status and handle errors gracefully
5. **Status Tracking**: Monitor document status for completion/failures

## 🐛 Troubleshooting

### OpenAI API Errors

- Check API key is valid
- Verify quota and billing
- System falls back to keyword-based mapping

### Supabase Connection Issues

- Verify URL and key are correct
- Check network connectivity
- Enable proxy if behind firewall

### File Upload Issues

- Check file size limits
- Verify file format (.xlsx, .xls, .csv)
- Check disk space in uploads directory

## 📚 Dependencies

- **FastAPI**: Modern web framework
- **OpenAI**: GPT-4 for intelligent column mapping
- **Pandas**: Data processing and manipulation
- **OpenPyXL**: Excel file handling
- **Supabase**: Database and file storage
- **Python-dotenv**: Environment variable management
- **Aiofiles**: Async file operations
- **Uvicorn**: ASGI server

## 📄 License

[Your License Here]

## 🤝 Contributing

[Contributing Guidelines]
