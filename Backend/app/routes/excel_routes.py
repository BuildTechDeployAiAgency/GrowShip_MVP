from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Form, BackgroundTasks
from fastapi.responses import JSONResponse
import os
import aiofiles
from typing import List, Optional
import pandas as pd
import numpy as np
import asyncio
import concurrent.futures
import uuid
from app.utils.excel_processor import ExcelProcessor
from app.services.supabase_service import SupabaseService
from app.models.schemas import ExcelUploadResponse, SheetDataResponse, FilterRequest

router = APIRouter()

# Ensure upload directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def store_file_to_supabase_background(file_content: bytes, filename: str, user_id: str, organization_id: str, document_id: str):
    """Background task to store file to Supabase storage using thread pool to prevent blocking"""
    try:
        print(f"[BACKGROUND] Starting file storage for: {filename}")
        supabase_service = SupabaseService()
        
        # Use thread pool executor to run file upload in separate thread
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            # Run the file upload in a separate thread
            storage_path = await loop.run_in_executor(
                executor,
                _upload_file_sync,
                file_content, filename, user_id, organization_id, document_id
            )
        
        # Update document status to success with document path
        await supabase_service.update_document_storage_status(
            document_id=document_id,
            status="success",
            document_path=storage_path
        )
        
        print(f"[BACKGROUND] File stored successfully: {storage_path}")
    except Exception as e:
        print(f"[BACKGROUND ERROR] Failed to store file {filename}: {str(e)}")
        
        # Update document status to failed
        try:
            supabase_service = SupabaseService()
            await supabase_service.update_document_storage_status(
                document_id=document_id,
                status="failed"
            )
            print(f"[BACKGROUND] Updated document status to failed for: {document_id}")
        except Exception as update_error:
            print(f"[BACKGROUND ERROR] Could not update document status to failed: {update_error}")

def _upload_file_sync(file_content: bytes, filename: str, user_id: str, organization_id: str, document_id: str) -> str:
    """Synchronous file upload function to be run in thread pool"""
    import asyncio
    from app.services.supabase_service import SupabaseService
    
    async def _async_upload():
        supabase_service = SupabaseService()
        storage_path = await supabase_service.upload_file_to_storage(
            file_content, 
            filename, 
            user_id, 
            organization_id,
            document_id
        )
        return storage_path
    
    # Run the async function in a new event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        storage_path = loop.run_until_complete(_async_upload())
        return storage_path
    finally:
        loop.close()

@router.post("/upload", response_model=ExcelUploadResponse)
async def upload_excel_file(file: UploadFile = File(...)):
    """Upload Excel file and get sheet names"""
    try:
        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(status_code=400, detail="Only Excel and CSV files are allowed")
        
        # Save uploaded file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Get sheet names
        sheet_names = ExcelProcessor.get_sheet_names(file_path)
        
        return ExcelUploadResponse(
            filename=file.filename,
            sheets=sheet_names,
            message="File uploaded successfully"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-and-process")
async def upload_and_process_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Form(...),
    organization_id: str = Form(...),
    sheet_name: str = Form(None),
    sample_size: int = Form(50)
):
    """Upload file, process with AI mapping, and store to Supabase"""
    file_path = None
    document_id = None
    
    try:
        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(status_code=400, detail="Only Excel and CSV files are allowed")
        
        # Initialize Supabase service
        supabase_service = SupabaseService()
        
        # Check for duplicate document BEFORE processing
        duplicate_info = await supabase_service.check_duplicate_document(
            file.filename, user_id, organization_id
        )
        
        if duplicate_info:
            if duplicate_info['is_duplicate']:
                status = duplicate_info['status']
                if status == 'processing':
                    message = "You uploaded this file already. It's currently being processed. Please wait for it to complete."
                elif status == 'success':
                    message = "You uploaded this file already. It has been successfully processed."
                else:
                    message = f"You uploaded this file already with status: {status}."
                
                return {
                    "filename": file.filename,
                    "document_id": duplicate_info['document_id'],
                    "is_duplicate": True,
                    "status": status,
                    "message": message
                }
            elif duplicate_info['can_retry']:
                # Retry failed upload
                document_id = duplicate_info['document_id']
                print(f"[INFO] Retrying failed upload with document_id: {document_id}")
                
                # Update status back to processing for retry
                await supabase_service.update_document_storage_status(
                    document_id=document_id,
                    status="processing"
                )
                
                # Continue with processing (don't return early for retry)
            else:
                status = duplicate_info['status']
                message = f"You uploaded this file already with status: {status}."
                
                return {
                    "filename": file.filename,
                    "document_id": duplicate_info['document_id'],
                    "is_duplicate": True,
                    "status": status,
                    "message": message
                }
        else:
            # Generate new document_id
            document_id = str(uuid.uuid4())
            print(f"[INFO] Generated new document_id: {document_id}")
        
        # Insert document record immediately with "processing" status (only for new uploads)
        if not duplicate_info or not duplicate_info.get('can_retry'):
            await supabase_service.insert_document_storage_metadata(
                document_name=file.filename,
                user_id=user_id,
                organization_id=organization_id,
                document_id=document_id,
                status="processing"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Save file locally for processing
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        # Process file with OpenAI mapping
        result = ExcelProcessor.process_file_with_openai_mapping(
            file_path, 
            sheet_name, 
            sample_size
        )
        
        # Create user table and organization view if they don't exist
        await supabase_service.create_user_table(user_id)
        await supabase_service.create_organization_view(organization_id, user_id)
        
        
        # Store mapped data with document_id
        store_success = await supabase_service.store_mapped_data(
            organization_id,
            user_id,
            result["mapped_data"],
            document_id  # Pass document_id here
        )

        # Create business functions
        await supabase_service.create_business_functions(organization_id)
        
        # Add file storage as background task (after response is sent)
        background_tasks.add_task(
            store_file_to_supabase_background,
            file_content,
            file.filename,
            user_id,
            organization_id,
            document_id  # Pass document_id to background task
        )
        
        # Determine if this is a retry or new upload
        is_retry = duplicate_info and duplicate_info.get('can_retry', False)
        
        return {
            "filename": file.filename,
            "sheet_used": result["sheet_used"],
            "mapping": result["mapping"],
            "validation": result["validation"],
            "storage_path": "pending",  # Will be processed in background
            "data_stored": store_success,
            "total_rows": int(result["total_rows"]),
            "document_id": document_id,
            "is_duplicate": False,
            "status": "processing",
            "is_retry": is_retry,
            "message": "Retrying failed upload! Processing and uploading to storage in progress." if is_retry else "File uploaded successfully! Processing and uploading to storage in progress."
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
    
    finally:
        # Always clean up local file to prevent locking issues
        if file_path:
            ExcelProcessor.safe_file_cleanup(file_path)

@router.delete("/document/{document_id}")
async def delete_document(
    document_id: str,
    user_id: str = Query(...),
    organization_id: str = Query(...)
):
    """Delete document and all associated data"""
    try:
        supabase_service = SupabaseService()
        success = await supabase_service.delete_document_and_data(
            document_id=document_id,
            user_id=user_id,
            organization_id=organization_id
        )
        
        if success:
            return {"message": "Document and associated data deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete document")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion error: {str(e)}")

@router.get("/sheets/{filename}")
async def get_sheets(filename: str):
    """Get all sheet names from uploaded file"""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        sheet_names = ExcelProcessor.get_sheet_names(file_path)
        
        return {
            "filename": filename,
            "sheets": sheet_names
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/{filename}/{sheet_name}", response_model=SheetDataResponse)
async def get_sheet_data(
    filename: str,
    sheet_name: str,
    limit: int = Query(100, ge=1, le=10000),
    offset: int = Query(0, ge=0)
):
    """Get data from specific sheet with pagination"""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Read Excel data
        sheets_data = ExcelProcessor.read_excel_file(file_path, sheet_name)
        
        if sheet_name not in sheets_data:
            raise HTTPException(status_code=404, detail="Sheet not found")
        
        sheet_info = sheets_data[sheet_name]
        df = sheet_info['data']
        
        # Apply pagination
        total_rows = len(df)
        paginated_df = df.iloc[offset:offset + limit]
        
        # Convert to dictionary
        data = ExcelProcessor.convert_to_dict(paginated_df)
        
        return SheetDataResponse(
            sheet_name=sheet_name,
            data=data,
            columns=sheet_info['columns'],
            total_rows=total_rows
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/data/{filename}/{sheet_name}/filter", response_model=SheetDataResponse)
async def filter_sheet_data(
    filename: str,
    sheet_name: str,
    filter_request: FilterRequest
):
    """Filter data from specific sheet"""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Read Excel data
        sheets_data = ExcelProcessor.read_excel_file(file_path, sheet_name)
        
        if sheet_name not in sheets_data:
            raise HTTPException(status_code=404, detail="Sheet not found")
        
        sheet_info = sheets_data[sheet_name]
        df = sheet_info['data']
        
        # Apply filters
        if filter_request.filters:
            filtered_df = ExcelProcessor.filter_data(df, filter_request.filters)
        else:
            filtered_df = df
        
        # Convert to dictionary with selected columns
        data = ExcelProcessor.convert_to_dict(
            filtered_df, 
            filter_request.columns
        )
        
        return SheetDataResponse(
            sheet_name=sheet_name,
            data=data,
            columns=filter_request.columns or sheet_info['columns'],
            total_rows=len(filtered_df)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/{filename}")
async def get_file_statistics(filename: str):
    """Get statistics about all sheets in the file"""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        sheets_data = ExcelProcessor.read_excel_file(file_path)
        
        stats = {}
        for sheet_name, sheet_info in sheets_data.items():
            df = sheet_info['data']
            stats[sheet_name] = {
                "rows": sheet_info['shape'][0],
                "columns": sheet_info['shape'][1],
                "column_names": sheet_info['columns'],
                "data_types": df.dtypes.astype(str).to_dict()
            }
        
        return {
            "filename": filename,
            "statistics": stats
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/map-columns/{filename}")
async def map_columns_with_openai(
    filename: str,
    sheet_name: str = Query(None, description="Sheet name (auto-detects best sheet if not provided)"),
    sample_size: int = Query(50, ge=10, le=100, description="Number of sample rows to send to OpenAI")
):
    """Map columns using OpenAI and return mapped data"""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Process file with OpenAI mapping
        result = ExcelProcessor.process_file_with_openai_mapping(
            file_path, 
            sheet_name, 
            sample_size
        )
        
        # Convert numpy types to Python native types for JSON serialization
        mapped_data_sample = ExcelProcessor.convert_to_dict(result["mapped_data"].head(10))
        
        return {
            "filename": filename,
            "sheet_used": result["sheet_used"],
            "mapping": result["mapping"],
            "validation": result["validation"],
            "original_columns": result["original_columns"],
            "mapped_columns": result["mapped_columns"],
            "total_rows": int(result["total_rows"]),
            "mapped_data_sample": mapped_data_sample,
            "message": "Columns mapped successfully using OpenAI"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Column mapping error: {str(e)}")

@router.get("/mapped-data/{filename}")
async def get_mapped_data(
    filename: str,
    sheet_name: str = Query(None, description="Sheet name (auto-detects best sheet if not provided)"),
    limit: int = Query(100, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    sample_size: int = Query(50, ge=10, le=100)
):
    """Get mapped data with pagination"""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Process file with OpenAI mapping
        result = ExcelProcessor.process_file_with_openai_mapping(
            file_path, 
            sheet_name, 
            sample_size
        )
        
        # Apply pagination to mapped data
        df_mapped = result["mapped_data"]
        total_rows = len(df_mapped)
        paginated_df = df_mapped.iloc[offset:offset + limit]
        
        # Convert to dictionary
        data = ExcelProcessor.convert_to_dict(paginated_df)
        
        return {
            "filename": filename,
            "sheet_used": result["sheet_used"],
            "mapping": result["mapping"],
            "validation": result["validation"],
            "data": data,
            "columns": result["mapped_columns"],
            "total_rows": int(total_rows),
            "offset": int(offset),
            "limit": int(limit)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting mapped data: {str(e)}")

@router.get("/mapped-data-summary/{filename}")
async def get_mapped_data_summary(
    filename: str,
    sheet_name: str = Query(None, description="Sheet name (auto-detects best sheet if not provided)"),
    sample_size: int = Query(50, ge=10, le=100)
):
    """Get summary statistics for mapped data"""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Process file with OpenAI mapping
        result = ExcelProcessor.process_file_with_openai_mapping(
            file_path, 
            sheet_name, 
            sample_size
        )
        
        # Get summary statistics
        summary = ExcelProcessor.get_mapped_data_summary(result["mapped_data"])
        
        return {
            "filename": filename,
            "sheet_used": result["sheet_used"],
            "mapping": result["mapping"],
            "validation": result["validation"],
            "summary": summary
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting mapped data summary: {str(e)}")

@router.get("/detect-best-sheet/{filename}")
async def detect_best_sheet(filename: str):
    """Detect the best sheet for comprehensive analysis"""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        result = ExcelProcessor.detect_best_sheet_for_analysis(file_path)
        
        return {
            "filename": filename,
            **result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/debug/{filename}")
async def debug_file_structure(
    filename: str,
    sheet_name: str = Query(None, description="Sheet name to debug (uses best sheet if not provided)")
):
    """Debug endpoint to see actual file structure and mapping process"""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Get available sheets
        available_sheets = ExcelProcessor.get_sheet_names(file_path)
        
        # Auto-detect best sheet if not provided
        if not sheet_name:
            best_sheet_info = ExcelProcessor.detect_best_sheet_for_analysis(file_path)
            sheet_name = best_sheet_info['best_sheet']
        
        if sheet_name not in available_sheets:
            return {
                "error": f"Sheet '{sheet_name}' not found",
                "available_sheets": available_sheets
            }
        
        # Read data with header detection
        sheets_data = ExcelProcessor.read_excel_file(file_path, sheet_name)
        df_original = sheets_data[sheet_name]['data']
        
        print(f"DEBUG: Original columns: {df_original.columns.tolist()}")
        print(f"DEBUG: Sample data:")
        print(df_original.head(2).to_string())
        
        # Clean data for JSON serialization
        def clean_for_json(df):
            df_clean = df.copy()
            # Replace NaN, inf, -inf with None for JSON compatibility
            df_clean = df_clean.replace([np.inf, -np.inf], None)
            df_clean = df_clean.where(pd.notnull(df_clean), None)
            return df_clean
        
        df_original_clean = clean_for_json(df_original.head(3))
        
        return {
            "filename": filename,
            "sheet_name": sheet_name,
            "available_sheets": available_sheets,
            "original_columns": df_original.columns.tolist(),
            "original_data_sample": df_original_clean.to_dict('records'),
            "original_data_types": df_original.dtypes.astype(str).to_dict(),
            "total_rows": len(df_original),
            "unnamed_columns_count": len([col for col in df_original.columns if str(col).startswith('Unnamed')])
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/business-questions/top-products")
async def get_top_products(
    organization_id: str = Query(...),
    user_id: str = Query(...),
    limit: int = Query(10, ge=1, le=100)
):
    """Get top products by sales"""
    try:
        supabase_service = SupabaseService()
        result = await supabase_service.call_business_function(
            "get_top_products_by_sales",
            organization_id,
            user_id,
            limit_count=limit
        )
        
        return {
            "organization_id": organization_id,
            "user_id": user_id,
            "top_products": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/business-questions/sales-by-country")
async def get_sales_by_country(
    organization_id: str = Query(...),
    user_id: str = Query(...)
):
    """Get sales by country"""
    try:
        supabase_service = SupabaseService()
        result = await supabase_service.call_business_function(
            "get_sales_by_country",
            organization_id,
            user_id
        )
        
        return {
            "organization_id": organization_id,
            "user_id": user_id,
            "sales_by_country": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/business-questions/monthly-trend")
async def get_monthly_trend(
    organization_id: str = Query(...),
    user_id: str = Query(...),
    year: int = Query(None)
):
    """Get monthly sales trend"""
    try:
        supabase_service = SupabaseService()
        result = await supabase_service.call_business_function(
            "get_monthly_sales_trend",
            organization_id,
            user_id,
            year_filter=year
        )
        
        return {
            "organization_id": organization_id,
            "user_id": user_id,
            "year_filter": year,
            "monthly_trend": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/business-questions/category-performance")
async def get_category_performance(
    organization_id: str = Query(...),
    user_id: str = Query(...)
):
    """Get category performance"""
    try:
        supabase_service = SupabaseService()
        result = await supabase_service.call_business_function(
            "get_category_performance",
            organization_id,
            user_id
        )
        
        return {
            "organization_id": organization_id,
            "user_id": user_id,
            "category_performance": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/{organization_id}/{user_id}")
async def get_user_data(
    organization_id: str,
    user_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get user's sales data with pagination"""
    try:
        supabase_service = SupabaseService()
        result = await supabase_service.get_user_data(
            organization_id,
            user_id,
            limit,
            offset
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/data/{organization_id}")
async def get_admin_data(
    organization_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get all organization data for admin (from admin view)"""
    try:
        supabase_service = SupabaseService()
        result = await supabase_service.get_admin_data(
            organization_id,
            limit,
            offset
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))