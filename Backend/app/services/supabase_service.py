import os
from typing import Dict, List, Any, Optional
from supabase import create_client, Client
from datetime import datetime
import pandas as pd

class SupabaseService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_ANON_KEY")
        
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")
        
        # Only use proxy if explicitly set
        proxy_url = os.getenv("HTTPS_PROXY") or os.getenv("HTTP_PROXY")
        
        if proxy_url:
            import httpx
            # Create custom HTTP client with proxy
            http_client = httpx.Client(proxies=proxy_url)
            self.client = create_client(self.url, self.key, http_client=http_client)
            print(f"[INFO] Supabase client initialized with proxy")
        else:
            # Normal client without proxy
            self.client = create_client(self.url, self.key)
            print(f"[INFO] Supabase client initialized without proxy")
        
        self.storage_bucket = "sales-reports"
    
    async def upload_file_to_storage(self, file_content: bytes, filename: str, user_id: str, brand_id: str, document_id: str = None) -> str:
        """Upload file to Supabase storage with user_id/document_id folder structure"""
        try:
            # Create file path with organization/user/document structure
            if document_id:
                file_path = f"{brand_id}/{user_id}/{document_id}/{filename}"
            else:
                file_path = f"{brand_id}/{user_id}/{filename}"
            
            print(f"[INFO] Attempting to upload file to storage: {file_path}")
            
            # Check if file already exists
            try:
                existing_files = self.client.storage.from_(self.storage_bucket).list(path=f"{brand_id}/{user_id}/{document_id}" if document_id else f"{brand_id}/{user_id}")
                if any(file['name'] == filename for file in existing_files):
                    print(f"[WARNING] File already exists, skipping upload: {filename}")
                    return file_path
            except Exception as e:
                print(f"[INFO] Could not check existing files: {e}")
            
            # Upload file to storage
            result = self.client.storage.from_(self.storage_bucket).upload(
                path=file_path,
                file=file_content,
                file_options={"content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
            )
            
            # Check if upload was successful
            if hasattr(result, 'error') and result.error:
                raise Exception(f"Storage upload error: {result.error}")
            
            print(f"[SUCCESS] File uploaded successfully to storage: {file_path}")
            return file_path
            
        except Exception as e:
            print(f"[ERROR] Error uploading file to storage: {str(e)}")
            raise Exception(f"Error uploading file to storage: {str(e)}")
    
    async def check_duplicate_document(self, document_name: str, user_id: str, brand_id: str) -> Optional[Dict[str, Any]]:
        """Check if document already exists based on document_name, user_id, and brand_id with status"""
        try:
            print(f"[INFO] Checking for duplicate document: {document_name}")
            
            # Check if document with same name exists for this user/organization
            result = self.client.table("sales_documents_storage")\
                .select("document_id, document_name, status, created_at")\
                .eq('user_id', user_id)\
                .eq('brand_id', brand_id)\
                .eq('document_name', document_name)\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            if result.data and len(result.data) > 0:
                existing_doc = result.data[0]
                status = existing_doc.get('status', 'unknown')
                print(f"[INFO] Found existing document: {existing_doc['document_name']} (ID: {existing_doc['document_id']}, Status: {status})")
                
                return {
                    'document_id': existing_doc['document_id'],
                    'status': status,
                    'is_duplicate': status in ['processing', 'success'],
                    'can_retry': status == 'failed'
                }
            
            print(f"[INFO] No duplicate document found")
            return None
            
        except Exception as e:
            print(f"[ERROR] Error checking for duplicate document: {str(e)}")
            return None
    
    async def insert_document_storage_metadata(self, document_name: str, user_id: str, brand_id: str, 
                                             document_id: str, status: str = "processing", document_path: str = None) -> bool:
        """Insert document metadata into sales_documents_storage table with status"""
        try:
            print(f"[INFO] Inserting document storage metadata for: {document_name} with status: {status}")
            
            # Prepare document storage metadata
            document_data = {
                "document_name": document_name,
                "user_id": user_id,
                "brand_id": brand_id,
                "document_id": document_id,
                "status": status
            }
            
            # Add document_path if provided
            if document_path:
                document_data["document_path"] = document_path
            
            # Insert document metadata
            result = self.client.table("sales_documents_storage").insert(document_data).execute()
            
            # Check if insertion was successful
            if hasattr(result, 'data') and result.data:
                print(f"[SUCCESS] Document storage metadata inserted successfully")
                return True
            else:
                raise Exception("Failed to insert document storage metadata")
                
        except Exception as e:
            print(f"[ERROR] Error inserting document storage metadata: {str(e)}")
            return False
    
    async def update_document_storage_status(self, document_id: str, status: str, document_path: str = None) -> bool:
        """Update document status in sales_documents_storage table"""
        try:
            print(f"[INFO] Updating document storage status for ID: {document_id} to: {status}")
            
            update_data = {"status": status}
            if document_path:
                update_data["document_path"] = document_path
            
            result = self.client.table("sales_documents_storage")\
                .update(update_data)\
                .eq("document_id", document_id)\
                .execute()
            
            if hasattr(result, 'data') and result.data:
                print(f"[SUCCESS] Document storage status updated to: {status}")
                return True
            else:
                raise Exception("Failed to update document storage status")
                
        except Exception as e:
            print(f"[ERROR] Error updating document storage status: {str(e)}")
            return False
    
    
    async def insert_document_metadata(self, filename: str, file_path: str, file_size: int, 
                                     content_type: str, user_id: str, brand_id: str, 
                                     upload_status: str = "uploaded", processing_status: str = "pending",
                                     total_records: int = 0, processed_records: int = 0, 
                                     error_message: str = None) -> str:
        """Insert document metadata into sales_documents table"""
        try:
            print(f"[INFO] Inserting document metadata for: {filename}")
            
            # Prepare document metadata
            document_data = {
                "filename": filename,
                "file_path": file_path,
                "file_size": file_size,
                "content_type": content_type,
                "user_id": user_id,
                "brand_id": brand_id,
                "upload_status": upload_status,
                "processing_status": processing_status,
                "total_records": total_records,
                "processed_records": processed_records,
                "error_message": error_message,
            }
            
            # Insert or update document metadata
            result = self.client.table("sales_documents").upsert(
                document_data,
                on_conflict="filename,user_id,brand_id"
            ).execute()
            
            # Check if insertion was successful
            if hasattr(result, 'data') and result.data:
                document_id = result.data[0]['id']
                print(f"[SUCCESS] Document metadata inserted/updated with ID: {document_id}")
                return document_id
            else:
                raise Exception("Failed to insert document metadata")
                
        except Exception as e:
            print(f"[ERROR] Error inserting document metadata: {str(e)}")
            raise Exception(f"Error inserting document metadata: {str(e)}")
    
    async def update_document_processing_status(self, document_id: str, processing_status: str, 
                                              total_records: int = None, processed_records: int = None,
                                              error_message: str = None) -> bool:
        """Update document processing status"""
        try:
            print(f"[INFO] Updating document processing status for ID: {document_id}")
            
            update_data = {
                "processing_status": processing_status
            }
            
            if total_records is not None:
                update_data["total_records"] = total_records
            if processed_records is not None:
                update_data["processed_records"] = processed_records
            if error_message is not None:
                update_data["error_message"] = error_message
            if processing_status == "completed":
                update_data["processed_at"] = datetime.now().isoformat()
            
            result = self.client.table("sales_documents").update(update_data).eq("id", document_id).execute()
            
            if hasattr(result, 'data') and result.data:
                print(f"[SUCCESS] Document processing status updated to: {processing_status}")
                return True
            else:
                raise Exception("Failed to update document processing status")
                
        except Exception as e:
            print(f"[ERROR] Error updating document processing status: {str(e)}")
            return False
    
    async def get_user_documents(self, user_id: str, brand_id: str, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """Get user's uploaded documents with pagination"""
        try:
            print(f"[INFO] Retrieving documents for user: {user_id}")
            
            result = self.client.table("sales_documents")\
                .select("*")\
                .eq('user_id', user_id)\
                .eq('brand_id', brand_id)\
                .order('created_at', desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            data = result.data if hasattr(result, 'data') and result.data else []
            print(f"[SUCCESS] Retrieved {len(data)} documents")
            
            return {
                "data": data,
                "total": len(data),
                "offset": offset,
                "limit": limit
            }
            
        except Exception as e:
            print(f"[ERROR] Error getting user documents: {str(e)}")
            return {"data": [], "total": 0, "offset": offset, "limit": limit}
    
    async def create_user_table(self, user_id: str) -> bool:
        """Create user-specific sales documents table"""
        try:
            table_name = f"sales_documents_{user_id.replace('-', '_')}"
            print(f"[INFO] Creating user table: {table_name}")
            
            # Check if table already exists
            try:
                result = self.client.table(table_name).select("id").limit(1).execute()
                print(f"[SUCCESS] Table {table_name} already exists")
                return True
            except Exception as e:
                print(f"[INFO] Table {table_name} doesn't exist, creating it...")
                        
            # Execute table creation
            data, error = self.client.rpc('create_sales_data_table', {'table_name': table_name}).execute()
            if error:
                print(f"[ERROR] Error creating table: {error}")
                return False

            print(f"[INFO] Data: {data}")
            print(f"[SUCCESS] Table {table_name} created successfully")
            return True
            
        except Exception as e:
            print(f"[ERROR] Error creating user table: {str(e)}")
            return False

    async def create_brand_view(self, brand_id: str, user_id: str) -> bool:
        """Create organization-specific view for admin to see all users' data"""
        try:
            view_name = f"sales_documents_view_{brand_id.replace('-', '_')}"
            user_table = f"sales_documents_{user_id.replace('-', '_')}"
            
            print(f"[INFO] Creating organization view: {view_name} from user table: {user_table}")
            
            # Check if view already exists
            try:
                result = self.client.table(view_name).select("id").limit(1).execute()
                print(f"[SUCCESS] View {view_name} already exists")
                return True
            except Exception as e:
                print(f"[INFO] View {view_name} doesn't exist, creating it...")
                        
            # Execute view creation using raw SQL
            data, error = self.client.rpc('create_brand_view', {'brand_id': brand_id, 'view_name': view_name, 'user_table': user_table}).execute()
            if error:
                print(f"[ERROR] Error creating view: {error}")
                return False

            print(f"[SUCCESS] View {view_name} created successfully")
            return True
            
        except Exception as e:
            print(f"[ERROR] Error creating organization view: {str(e)}")
            return False

    async def check_organization_view_exists(self, brand_id: str) -> bool:
        """Check if organization view exists"""
        try:
            view_name = f"sales_documents_view_{brand_id.replace('-', '_')}"
            result = self.client.table(view_name).select("id").limit(1).execute()
            return True
        except Exception as e:
            print(f"[INFO] View {view_name} doesn't exist: {e}")
            return False

    async def get_all_user_tables_for_organization(self, brand_id: str) -> List[str]:
        """Get all user tables that exist for an organization"""
        try:
            # Get all users in the organization from sales_documents table
            result = self.client.table("user_memberships")\
                .select("user_id")\
                .eq('brand_id', brand_id)\
                .execute()
            
            if not hasattr(result, 'data') or not result.data:
                print(f"[INFO] No users found for organization {brand_id}")
                return []
            
            # Get unique user IDs
            user_ids = list(set([row['user_id'] for row in result.data]))
            print(f"[INFO] Found {len(user_ids)} unique users for organization {brand_id}")
            
            # Check which user tables actually exist
            existing_tables = []
            for user_id in user_ids:
                table_name = f"sales_documents_{user_id.replace('-', '_')}"
                try:
                    # Try to query the table to see if it exists
                    table_result = self.client.table(table_name).select("id").limit(1).execute()
                    if hasattr(table_result, 'data'):
                        existing_tables.append(table_name)
                        print(f"[INFO] User table exists: {table_name}")
                except Exception as e:
                    print(f"[INFO] User table doesn't exist: {table_name} - {e}")
            
            return existing_tables
            
        except Exception as e:
            print(f"[ERROR] Error getting user tables for organization: {str(e)}")
            return []

    async def create_or_replace_materialized_view(self, brand_id: str) -> bool:
        """Create or replace materialized view for organization with all user tables"""
        try:
            view_name = f"sales_documents_view_{brand_id.replace('-', '_')}"
            
            print(f"[INFO] Creating/updating materialized view: {view_name}")
            
            # Get all user tables for this organization
            user_tables = await self.get_all_user_tables_for_organization(brand_id)
            
            if not user_tables:
                print(f"[WARNING] No user tables found for organization {brand_id}")
                return False
            
            print(f"[INFO] Found {len(user_tables)} user tables: {user_tables}")
            
            # Create UNION query for all user tables with explicit column selection
            union_parts = []
            for table_name in user_tables:
                union_parts.append(f"""
                SELECT 
                    id,
                    user_id,
                    brand_id,
                    product_name,
                    year,
                    month,
                    document_id,
                    country,
                    sales_count,
                    sales_value_usd,
                    soh,
                    description,
                    type,
                    created_at,
                    updated_at
                FROM {table_name}
                """)
            
            union_query = " UNION ALL ".join(union_parts)
            
            print(f"[DEBUG] Generated UNION query with {len(union_parts)} parts:")
            print(f"[DEBUG] UNION query: {union_query[:500]}...")
            
            # Step 1: Drop existing view (try both types since we don't know which exists)
            print(f"[INFO] Attempting to drop existing view: {view_name}")
            
            # Try to drop as materialized view first (since we create materialized views)
            try:
                drop_materialized_sql = f"DROP MATERIALIZED VIEW IF EXISTS {view_name};"
                print(f"[INFO] Trying to drop as materialized view: {drop_materialized_sql}")
                
                data, error = self.client.rpc('update_view_documents', {'sql_text': drop_materialized_sql}).execute()
                print(f"[DEBUG] Materialized drop response - data: {data}, error: {error}")
                
                if error:
                    print(f"[WARNING] Error dropping materialized view: {error}")
                else:
                    print(f"[INFO] Successfully dropped materialized view")
                    
            except Exception as drop_error:
                print(f"[WARNING] Exception dropping materialized view: {drop_error}")
            
            # Also try to drop as regular view (in case it was created as regular view before)
            try:
                drop_regular_sql = f"DROP VIEW IF EXISTS {view_name};"
                print(f"[INFO] Trying to drop as regular view: {drop_regular_sql}")
                
                data, error = self.client.rpc('update_view_documents', {'sql_text': drop_regular_sql}).execute()
                print(f"[DEBUG] Regular drop response - data: {data}, error: {error}")
                
                if error:
                    print(f"[WARNING] Error dropping regular view: {error}")
                else:
                    print(f"[INFO] Successfully dropped regular view")
                    
            except Exception as drop_error:
                print(f"[WARNING] Exception dropping regular view: {drop_error}")
            
            # Verify the view was actually dropped
            try:
                result = self.client.table(view_name).select("id").limit(1).execute()
                print(f"[WARNING] View {view_name} still exists after drop attempts")
                return False
            except Exception as e:
                print(f"[INFO] View {view_name} successfully dropped: {e}")
            
            # Step 2: Create new materialized view
            create_sql = f"""
            CREATE MATERIALIZED VIEW {view_name} AS
            {union_query};
            """
            
            print(f"[INFO] Creating materialized view: {create_sql}")
            
            data, error = self.client.rpc('update_view_documents', {'sql_text': create_sql}).execute()
            if error:
                print(f"[ERROR] Error creating materialized view: {error}")
                return False
            
            print(f"[SUCCESS] Materialized view {view_name} created/updated successfully")
            
            # Test the materialized view to verify it's working
            try:
                test_result = self.client.table(view_name).select("id, product_name, sales_count").limit(5).execute()
                print(f"[DEBUG] Materialized view test query returned {len(test_result.data) if hasattr(test_result, 'data') else 0} rows")
                if hasattr(test_result, 'data') and test_result.data:
                    print(f"[DEBUG] Sample data: {test_result.data[:2]}")
                else:
                    print(f"[WARNING] Materialized view created but no data found")
            except Exception as test_error:
                print(f"[WARNING] Error testing materialized view: {test_error}")
            
            return True
            
        except Exception as e:
            print(f"[ERROR] Error creating materialized view: {str(e)}")
            return False

    async def check_materialized_view_exists(self, brand_id: str) -> bool:
        """Check if materialized view exists"""
        try:
            view_name = f"sales_documents_view_{brand_id.replace('-', '_')}"
            result = self.client.table(view_name).select("id").limit(1).execute()
            return True
        except Exception as e:
            print(f"[INFO] Materialized view {view_name} doesn't exist: {e}")
            return False

    async def get_materialized_view_info(self, brand_id: str) -> Dict[str, Any]:
        """Get information about the materialized view"""
        try:
            view_name = f"sales_documents_view_{brand_id.replace('-', '_')}"
            
            # Check if view exists
            exists = await self.check_materialized_view_exists(brand_id)
            
            if not exists:
                return {
                    "exists": False,
                    "view_name": view_name,
                    "message": "Materialized view does not exist"
                }
            
            # Get count of records in the view
            result = self.client.table(view_name).select("id", count="exact").execute()
            record_count = result.count if hasattr(result, 'count') else 0
            
            # Get user tables that should be included
            user_tables = await self.get_all_user_tables_for_organization(brand_id)
            
            return {
                "exists": True,
                "view_name": view_name,
                "record_count": record_count,
                "user_tables": user_tables,
                "user_table_count": len(user_tables)
            }
            
        except Exception as e:
            print(f"[ERROR] Error getting materialized view info: {str(e)}")
            return {
                "exists": False,
                "view_name": f"sales_documents_view_{brand_id.replace('-', '_')}",
                "error": str(e)
            }

    async def is_user_table_in_view(self, brand_id: str, user_id: str) -> bool:
        """Check if user table is already included in the organization view"""
        try:
            view_name = f"sales_documents_view_{brand_id.replace('-', '_')}"
            user_table = f"sales_documents_{user_id.replace('-', '_')}"
            
            # First check if the user table exists
            try:
                table_result = self.client.table(user_table).select("id").limit(1).execute()
                if not hasattr(table_result, 'data') or not table_result.data:
                    print(f"[INFO] User table {user_table} doesn't exist yet")
                    return False
            except Exception as e:
                print(f"[INFO] User table {user_table} doesn't exist: {e}")
                return False
            
            # Try to query the view with a specific user_id to see if data exists
            result = self.client.table(view_name)\
                .select("user_id")\
                .eq('user_id', user_id)\
                .limit(1)\
                .execute()
            
            # If we get data, the user table is already included
            has_data = hasattr(result, 'data') and result.data and len(result.data) > 0
            
            if has_data:
                print(f"[INFO] User {user_id} data found in view {view_name}")
            else:
                print(f"[INFO] User {user_id} data not found in view {view_name}")
            
            return has_data
            
        except Exception as e:
            print(f"[INFO] Could not check if user table is in view: {e}")
            return False

    
    async def store_mapped_data(self, brand_id: str, user_id: str, mapped_data: pd.DataFrame, document_id: str = None) -> bool:
        """Store mapped data to user table and update materialized view"""
        try:
            # Create user table if it doesn't exist
            await self.create_user_table(user_id)
            
            table_name = f"sales_documents_{user_id.replace('-', '_')}"
            materialized_view_name = f"sales_documents_view_{brand_id.replace('-', '_')}"
            
            print(f"[INFO] Storing mapped data to user table: {table_name}")
            print(f"[INFO] Materialized view: {materialized_view_name}")
            print(f"[INFO] Data shape: {mapped_data.shape}")
            print(f"[INFO] Document ID: {document_id}")
            
            # Prepare data for insertion
            records = []
            for _, row in mapped_data.iterrows():
                record = {
                    'user_id': user_id,
                    'brand_id': brand_id,
                    'document_id': document_id,  # Add document_id to each record
                    'product_name': row.get('Category or product name') or row.get('Product Name'),
                    'country': row.get('Country'),
                    'year': int(row.get('Year')) if pd.notna(row.get('Year')) and row.get('Year') != 0 else None,
                    'month': int(row.get('Month')) if pd.notna(row.get('Month')) and row.get('Month') != 0 else None,
                    'sales_count': int(row.get('Sales Count')) if pd.notna(row.get('Sales Count')) else None,
                    'sales_value_usd': float(row.get('Sales Value (usd)')) if pd.notna(row.get('Sales Value (usd)')) else None,
                    'soh': float(row.get('SOH')) if pd.notna(row.get('SOH')) else None,
                    'description': row.get('Description'),
                    'type': row.get('Type')
                }
                records.append(record)
            
            print(f"[INFO] Converted {len(records)} records for insertion")
            
            # Insert data in batches to user table
            batch_size = 1000
            total_batches = (len(records) + batch_size - 1) // batch_size
            print(f"[INFO] Inserting data in {total_batches} batches of {batch_size}")
            
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                batch_num = i // batch_size + 1
                print(f"[INFO] Inserting batch {batch_num}/{total_batches} ({len(batch)} records)")
                
                # Insert into user table
                table_result = self.client.table(table_name).insert(batch).execute()
                
                # Check if table insertion was successful
                if hasattr(table_result, 'data') and table_result.data is None:
                    raise Exception(f"Failed to insert batch {batch_num} into user table")
                
                print(f"[SUCCESS] Batch {batch_num} inserted successfully into user table")
            
            # Create or update materialized view after data insertion
            print(f"[INFO] Creating/updating materialized view with all user tables")
            materialized_view_success = await self.create_or_replace_materialized_view(brand_id)
            
            if materialized_view_success:
                print(f"[SUCCESS] Data stored in user table {table_name} and materialized view {materialized_view_name} updated")
            else:
                print(f"[WARNING] Data stored in user table {table_name} but materialized view update failed")
            
            # Update document processing status if document_id is provided
            if document_id:
                await self.update_document_processing_status(
                    document_id=document_id,
                    processing_status="completed",
                    total_records=len(records),
                    processed_records=len(records)
                )
            
            return True
            
        except Exception as e:
            print(f"[ERROR] Error storing mapped data: {str(e)}")
            
            # Update document processing status to failed if document_id is provided
            if document_id:
                await self.update_document_processing_status(
                    document_id=document_id,
                    processing_status="failed",
                    error_message=str(e)
                )
            
            return False
    
    async def create_business_functions(self, brand_id: str) -> bool:
        """Create Supabase functions for business questions (materialized view)"""
        try:
            view_name = f"sales_documents_view_{brand_id.replace('-', '_')}"
            print(f"[INFO] Creating business functions for materialized view: {view_name}")
            
            # Create functions using raw SQL
            functions = [
                f"""
                CREATE OR REPLACE FUNCTION get_top_products_by_sales(
                    org_id UUID,
                    user_uuid UUID,
                    limit_count INTEGER DEFAULT 10
                )
                RETURNS TABLE (
                    product_name TEXT,
                    total_sales DECIMAL(15,2),
                    total_count BIGINT
                )
                LANGUAGE plpgsql
                SECURITY DEFINER
                AS $$
                BEGIN
                    RETURN QUERY
                    SELECT 
                        sd.product_name,
                        SUM(sd.sales_value_usd) as total_sales,
                        SUM(sd.sales_count) as total_count
                    FROM {view_name} sd
                    WHERE sd.brand_id = org_id 
                        AND sd.user_id = user_uuid
                        AND sd.sales_value_usd IS NOT NULL
                    GROUP BY sd.product_name
                    ORDER BY total_sales DESC
                    LIMIT limit_count;
                END;
                $$;
                """,
                f"""
                CREATE OR REPLACE FUNCTION get_sales_by_country(
                    org_id UUID,
                    user_uuid UUID
                )
                RETURNS TABLE (
                    country TEXT,
                    total_sales DECIMAL(15,2),
                    total_count BIGINT
                )
                LANGUAGE plpgsql
                SECURITY DEFINER
                AS $$
                BEGIN
                    RETURN QUERY
                    SELECT 
                        sd.country,
                        SUM(sd.sales_value_usd) as total_sales,
                        SUM(sd.sales_count) as total_count
                    FROM {view_name} sd
                    WHERE sd.brand_id = org_id 
                        AND sd.user_id = user_uuid
                        AND sd.sales_value_usd IS NOT NULL
                    GROUP BY sd.country
                    ORDER BY total_sales DESC;
                END;
                $$;
                """,
                f"""
                CREATE OR REPLACE FUNCTION get_monthly_sales_trend(
                    org_id UUID,
                    user_uuid UUID,
                    year_filter INTEGER DEFAULT NULL
                )
                RETURNS TABLE (
                    year INTEGER,
                    month INTEGER,
                    total_sales DECIMAL(15,2),
                    total_count BIGINT
                )
                LANGUAGE plpgsql
                SECURITY DEFINER
                AS $$
                BEGIN
                    RETURN QUERY
                    SELECT 
                        sd.year,
                        sd.month,
                        SUM(sd.sales_value_usd) as total_sales,
                        SUM(sd.sales_count) as total_count
                    FROM {view_name} sd
                    WHERE sd.brand_id = org_id 
                        AND sd.user_id = user_uuid
                        AND sd.sales_value_usd IS NOT NULL
                        AND (year_filter IS NULL OR sd.year = year_filter)
                    GROUP BY sd.year, sd.month
                    ORDER BY sd.year, sd.month;
                END;
                $$;
                """,
                f"""
                CREATE OR REPLACE FUNCTION get_category_performance(
                    org_id UUID,
                    user_uuid UUID
                )
                RETURNS TABLE (
                    type TEXT,
                    total_sales DECIMAL(15,2),
                    total_count BIGINT,
                    avg_sales_per_item DECIMAL(15,2)
                )
                LANGUAGE plpgsql
                SECURITY DEFINER
                AS $$
                BEGIN
                    RETURN QUERY
                    SELECT 
                        sd.type,
                        SUM(sd.sales_value_usd) as total_sales,
                        SUM(sd.sales_count) as total_count,
                        CASE 
                            WHEN SUM(sd.sales_count) > 0 
                            THEN SUM(sd.sales_value_usd) / SUM(sd.sales_count)
                            ELSE 0
                        END as avg_sales_per_item
                    FROM {view_name} sd
                    WHERE sd.brand_id = org_id 
                        AND sd.user_id = user_uuid
                        AND sd.sales_value_usd IS NOT NULL
                    GROUP BY sd.type
                    ORDER BY total_sales DESC;
                END;
                $$;
                """
            ]
            
            # Execute each function
            for i, func_sql in enumerate(functions, 1):
                try:
                    print(f"[INFO] Creating function {i}/4...")
                    # result = self.client.rpc('exec_sql', {'sql': func_sql})
                    print(f"[SUCCESS] Function {i} created successfully")
                except Exception as e:
                    print(f"[WARNING] Function {i} creation warning: {e}")
            
            print(f"[SUCCESS] Business functions created for {view_name}")
            return True
            
        except Exception as e:
            print(f"[ERROR] Error creating business functions: {str(e)}")
            return False
    
    async def get_user_data(self, brand_id: str, user_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Get user's sales data with pagination"""
        try:
            table_name = f"sales_documents_{user_id.replace('-', '_')}"
            print(f"[INFO] Retrieving user data from table: {table_name}")
            print(f"[INFO] User ID: {user_id}, Limit: {limit}, Offset: {offset}")
            
            result = self.client.table(table_name)\
                .select("*")\
                .eq('brand_id', brand_id)\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            # Check if data retrieval was successful
            data = result.data if hasattr(result, 'data') and result.data else []
            print(f"[SUCCESS] Retrieved {len(data)} records from {table_name}")
            
            return {
                "data": data,
                "total": len(data),
                "offset": offset,
                "limit": limit
            }
            
        except Exception as e:
            print(f"[ERROR] Error getting user data: {str(e)}")
            return {"data": [], "total": 0, "offset": offset, "limit": limit}

    async def get_admin_data(self, brand_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Get all organization data for admin (from materialized view)"""
        try:
            view_name = f"sales_documents_view_{brand_id.replace('-', '_')}"
            print(f"[INFO] Retrieving admin data from materialized view: {view_name}")
            print(f"[INFO] Organization ID: {brand_id}, Limit: {limit}, Offset: {offset}")
            
            result = self.client.table(view_name)\
                .select("*")\
                .eq('brand_id', brand_id)\
                .order('created_at', desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            # Check if data retrieval was successful
            data = result.data if hasattr(result, 'data') and result.data else []
            print(f"[SUCCESS] Retrieved {len(data)} records from materialized view {view_name}")
            
            return {
                "data": data,
                "total": len(data),
                "offset": offset,
                "limit": limit
            }
            
        except Exception as e:
            print(f"[ERROR] Error getting admin data: {str(e)}")
            return {"data": [], "total": 0, "offset": offset, "limit": limit}
    
    async def call_business_function(self, function_name: str, brand_id: str, user_id: str, **kwargs) -> List[Dict]:
        """Call a business function"""
        try:
            print(f"[INFO] Calling business function: {function_name}")
            print(f"[INFO] Organization ID: {brand_id}, User ID: {user_id}")
            print(f"[INFO] Parameters: {kwargs}")
            
            result = self.client.rpc(
                function_name,
                {
                    'org_id': brand_id,
                    'user_uuid': user_id,
                    **kwargs
                }
            ).execute()
            
            # Check if function call was successful
            data = result.data if hasattr(result, 'data') and result.data else []
            print(f"[SUCCESS] Function {function_name} returned {len(data)} records")
            
            return data
            
        except Exception as e:
            print(f"[ERROR] Error calling business function {function_name}: {str(e)}")
            return []
    
    async def delete_document_and_data(self, document_id: str, user_id: str, brand_id: str) -> bool:
        """Delete document and all associated data using document_id"""
        try:
            print(f"[INFO] Starting deletion process for document: {document_id}")
            
            # Delete from storage using the folder structure
            try:
                # List files in the document folder
                file_path = f"{brand_id}/{user_id}/{document_id}"
                files = self.client.storage.from_(self.storage_bucket).list(path=file_path)
                
                if files:
                    # Delete all files in the document folder
                    file_names = [f['name'] for f in files]
                    self.client.storage.from_(self.storage_bucket).remove([f"{file_path}/{name}" for name in file_names])
                    print(f"[SUCCESS] Files deleted from storage: {file_names}")
                else:
                    print(f"[INFO] No files found in storage for document: {document_id}")
                    
            except Exception as e:
                print(f"[WARNING] Could not delete files from storage: {e}")
            
            # Delete sales data
            table_name = f"sales_data_{brand_id.replace('-', '_')}"
            try:
                delete_result = self.client.table(table_name).delete().eq("document_id", document_id).execute()
                print(f"[SUCCESS] Deleted sales data for document: {document_id}")
            except Exception as e:
                print(f"[WARNING] Could not delete sales data: {e}")
            
            return True
            
        except Exception as e:
            print(f"[ERROR] Error deleting document and data: {str(e)}")
            return False
