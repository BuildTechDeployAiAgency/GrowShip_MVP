import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
import io
from datetime import datetime
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import time
import gc
from app.utils.openai_mapper import OpenAIColumnMapper

class ExcelProcessor:
    @staticmethod
    def safe_file_cleanup(file_path: str, max_retries: int = 3) -> bool:
        """Safely clean up file with retry mechanism to handle file locking issues"""
        if not file_path or not os.path.exists(file_path):
            return True
        
        for attempt in range(max_retries):
            try:
                # Force garbage collection to release any file handles
                gc.collect()
                
                # Small delay to ensure file handles are closed
                time.sleep(0.1 * (attempt + 1))
                
                # Try to remove the file
                os.remove(file_path)
                print(f"[SUCCESS] Successfully cleaned up file: {file_path}")
                return True
                
            except PermissionError as e:
                if attempt < max_retries - 1:
                    print(f"[WARNING] File locked, retrying in {0.2 * (attempt + 1)}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(0.2 * (attempt + 1))
                else:
                    print(f"[ERROR] Could not clean up file {file_path} after {max_retries} attempts: {e}")
                    return False
            except Exception as e:
                print(f"[ERROR] Error cleaning up file {file_path}: {e}")
                return False
        
        return False

    @staticmethod
    def get_sheet_names(file_path: str) -> List[str]:
        """Get all sheet names from Excel/CSV file"""
        try:
            if file_path.lower().endswith('.csv'):
                # For CSV files, return the filename as the sheet name
                csv_sheet_name = os.path.splitext(os.path.basename(file_path))[0]
                return [csv_sheet_name]
            else:
                with pd.ExcelFile(file_path) as excel_file:
                    return list(excel_file.sheet_names)
        except Exception as e:
            file_type = "CSV" if file_path.lower().endswith('.csv') else "Excel"
            raise Exception(f"Error reading {file_type} file: {str(e)}")

    @staticmethod
    def detect_best_sheet_for_analysis(file_path: str) -> Dict[str, Any]:
        """Detect the best sheet for comprehensive analysis focusing on sales-related data"""
        try:
            sheets_data = ExcelProcessor.read_excel_file(file_path)
            sheet_scores = {}
            
            for sheet_name, sheet_info in sheets_data.items():
                df = sheet_info['data']
                score = 0
                available_columns = []
                sales_indicators = []
                
                # Check for sales-related keywords in column names (case-insensitive)
                column_text = ' '.join([str(col).lower() for col in df.columns])
                
                # Sales-related keywords with different weights
                sales_keywords = {
                    'sales': 15, 'revenue': 15, 'amount': 10, 'value': 10, 'earning': 10,
                    'product': 12, 'item': 12, 'description': 8,
                    'quantity': 10, 'qty': 10, 'volume': 8, 'ims': 8, 'soh': 6,
                    'category': 8, 'type': 6, 'group': 6,
                    'price': 8, 'cost': 6, 'rate': 6, 'ptt': 6,
                    'country': 6, 'region': 6, 'market': 6,
                    'year': 5, 'month': 5, 'date': 5,
                    'customer': 5, 'client': 5,
                    'profit': 10, 'margin': 8, 'gain': 8
                }
                
                # Score based on sales-related keywords found
                for keyword, weight in sales_keywords.items():
                    if keyword in column_text:
                        score += weight
                        sales_indicators.append(keyword)
                
                # Check for specific column patterns that indicate sales data
                for col in df.columns:
                    col_lower = str(col).lower()
                    if any(keyword in col_lower for keyword in ['sales', 'revenue', 'amount', 'value']):
                        available_columns.append(col)
                        score += 5
                    elif any(keyword in col_lower for keyword in ['product', 'item', 'description']):
                        available_columns.append(col)
                        score += 3
                    elif any(keyword in col_lower for keyword in ['quantity', 'qty', 'volume', 'ims']):
                        available_columns.append(col)
                        score += 3
                
                # Check for data quality (non-empty rows with numeric data)
                non_empty_rows = len(df.dropna(how='all'))
                if non_empty_rows > 0:
                    score += min(non_empty_rows / 200, 15)  # Max 15 points for data volume
                
                # Check for numeric data in potential sales columns
                numeric_data_score = 0
                for col in df.columns:
                    col_lower = str(col).lower()
                    if any(keyword in col_lower for keyword in ['sales', 'revenue', 'amount', 'value', 'quantity', 'qty', 'ims']):
                        try:
                            numeric_data = pd.to_numeric(df[col], errors='coerce').notna().sum()
                            if numeric_data > 0:
                                numeric_data_score += min(numeric_data / 100, 10)  # Max 10 points per column
                        except:
                            pass
                
                score += min(numeric_data_score, 20)  # Max 20 points for numeric data
                
                # Penalty for too many unnamed columns
                unnamed_cols = [col for col in df.columns if str(col).startswith('Unnamed')]
                if len(unnamed_cols) > len(df.columns) * 0.7:  # More than 70% unnamed
                    score -= 20
                
                # Bonus for sheets with names suggesting sales data
                sheet_lower = sheet_name.lower()
                if any(keyword in sheet_lower for keyword in ['sales', 'revenue', 'raw', 'data', 'report', 'siso', 'q1']):
                    score += 10
                
                sheet_scores[sheet_name] = {
                    'score': max(0, score),  # Ensure non-negative score
                    'available_columns': available_columns,
                    'sales_indicators': sales_indicators,
                    'total_rows': len(df),
                    'non_empty_rows': non_empty_rows,
                    'unnamed_columns': len(unnamed_cols),
                    'numeric_data_score': numeric_data_score
                }
            
            # Find the best sheet
            if not sheet_scores:
                raise Exception("No sheets found in the file")
            
            best_sheet = max(sheet_scores.keys(), key=lambda x: sheet_scores[x]['score'])
            best_score = sheet_scores[best_sheet]['score']
            
            # If best score is too low, warn the user
            if best_score < 10:
                recommendation = f"Sheet '{best_sheet}' has the highest score ({best_score:.1f}) but may not contain sufficient sales data. Consider checking the file structure."
            else:
                recommendation = f"Sheet '{best_sheet}' has the highest score ({best_score:.1f}) and appears to contain sales-related data."
            
            return {
                'best_sheet': best_sheet,
                'sheet_scores': sheet_scores,
                'recommendation': recommendation,
                'best_score': best_score
            }
            
        except Exception as e:
            raise Exception(f"Error detecting best sheet: {str(e)}")

    @staticmethod
    def read_excel_file(file_path: str, sheet_name: str = None) -> Dict[str, Any]:
        """Read Excel/CSV file and return data with improved header detection"""
        try:
            # Check if file is CSV
            if file_path.lower().endswith('.csv'):
                return ExcelProcessor._read_csv_file(file_path, sheet_name)
            else:
                # Handle Excel files
                if sheet_name:
                    # Read specific sheet with header detection
                    df = ExcelProcessor._read_sheet_with_header_detection(file_path, sheet_name)
                    return {
                        sheet_name: {
                            'data': df,
                            'columns': df.columns.tolist(),
                            'shape': df.shape
                        }
                    }
                else:
                    # Read all sheets with proper file handling
                    with pd.ExcelFile(file_path) as excel_file:
                        sheets_data = {}
                        
                        for sheet in excel_file.sheet_names:
                            df = ExcelProcessor._read_sheet_with_header_detection(file_path, sheet)
                            sheets_data[sheet] = {
                                'data': df,
                                'columns': df.columns.tolist(),
                                'shape': df.shape
                            }
                        
                        return sheets_data
        except Exception as e:
            file_type = "CSV" if file_path.lower().endswith('.csv') else "Excel"
            raise Exception(f"Error processing {file_type} file: {str(e)}")

    @staticmethod
    def _read_csv_file(file_path: str, sheet_name: str = None) -> Dict[str, Any]:
        """Read CSV file and return data with improved header detection"""
        try:
            # For CSV files, we treat the entire file as a single "sheet"
            # The sheet_name parameter is ignored for CSV files
            df = ExcelProcessor._read_csv_with_header_detection(file_path)
            
            # Use filename as sheet name for CSV files
            csv_sheet_name = os.path.splitext(os.path.basename(file_path))[0]
            
            return {
                csv_sheet_name: {
                    'data': df,
                    'columns': df.columns.tolist(),
                    'shape': df.shape
                }
            }
        except Exception as e:
            raise Exception(f"Error processing CSV file: {str(e)}")

    @staticmethod
    def _read_csv_with_header_detection(file_path: str) -> pd.DataFrame:
        """Read CSV with automatic header detection and encoding detection"""
        try:
            # Try different encodings
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            
            for encoding in encodings:
                try:
                    # First, try reading with default settings
                    df = pd.read_csv(file_path, encoding=encoding)
                    
                    # Check if we have mostly unnamed columns
                    unnamed_cols = [col for col in df.columns if str(col).startswith('Unnamed')]
                    
                    if len(unnamed_cols) > len(df.columns) * 0.5:  # More than 50% unnamed columns
                        print(f"Detected unnamed columns in CSV, trying to find header row...")
                        
                        # Try reading with different header rows
                        for header_row in range(1, min(10, len(df))):  # Check first 10 rows
                            try:
                                df_test = pd.read_csv(file_path, encoding=encoding, header=header_row)
                                
                                # Check if this looks like a proper header
                                if ExcelProcessor._is_valid_header(df_test.columns):
                                    print(f"Found valid header at row {header_row}")
                                    return df_test
                            except:
                                continue
                        
                        # If no valid header found, try to infer from data
                        df = ExcelProcessor._infer_headers_from_data(df)
                    
                    return df
                    
                except UnicodeDecodeError:
                    continue
                except Exception as e:
                    print(f"Error reading CSV with encoding {encoding}: {e}")
                    continue
            
            # If all encodings fail, try with error handling
            df = pd.read_csv(file_path, encoding='utf-8', errors='ignore')
            return df
            
        except Exception as e:
            print(f"Error reading CSV file: {str(e)}")
            return pd.DataFrame()

    @staticmethod
    def _read_sheet_with_header_detection(file_path: str, sheet_name: str) -> pd.DataFrame:
        """Read sheet with automatic header detection for unnamed columns"""
        try:
            # First, try reading with default header (row 0)
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Check if we have mostly unnamed columns
            unnamed_cols = [col for col in df.columns if str(col).startswith('Unnamed')]
            
            if len(unnamed_cols) > len(df.columns) * 0.5:  # More than 50% unnamed columns
                print(f"Detected unnamed columns in {sheet_name}, trying to find header row...")
                
                # Try reading with different header rows
                for header_row in range(1, min(10, len(df))):  # Check first 10 rows
                    try:
                        df_test = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row)
                        
                        # Check if this looks like a proper header
                        if ExcelProcessor._is_valid_header(df_test.columns):
                            print(f"Found valid header at row {header_row}")
                            return df_test
                    except:
                        continue
                
                # If no valid header found, try to infer from data
                df = ExcelProcessor._infer_headers_from_data(df)
            
            return df
            
        except Exception as e:
            print(f"Error reading sheet {sheet_name}: {str(e)}")
            return pd.DataFrame()

    @staticmethod
    def _is_valid_header(columns) -> bool:
        """Check if columns look like valid headers"""
        if len(columns) == 0:
            return False
        
        # Check for sales-related keywords
        sales_keywords = ['sales', 'product', 'item', 'category', 'quantity', 'price', 'revenue', 'profit', 'country', 'year', 'month']
        column_text = ' '.join([str(col).lower() for col in columns])
        
        # Count how many sales-related keywords are found
        keyword_count = sum(1 for keyword in sales_keywords if keyword in column_text)
        
        # Also check for unnamed columns
        unnamed_count = sum(1 for col in columns if str(col).startswith('Unnamed'))
        
        # Valid if we have sales keywords and not too many unnamed columns
        return keyword_count >= 2 and unnamed_count < len(columns) * 0.5

    @staticmethod
    def _infer_headers_from_data(df: pd.DataFrame) -> pd.DataFrame:
        """Try to infer headers from data patterns"""
        try:
            # Look for rows that might contain headers
            for i in range(min(5, len(df))):
                row = df.iloc[i]
                
                # Check if this row contains sales-related keywords
                row_text = ' '.join([str(val).lower() for val in row if pd.notna(val)])
                sales_keywords = ['sales', 'product', 'item', 'category', 'quantity', 'price', 'revenue', 'profit']
                
                if any(keyword in row_text for keyword in sales_keywords):
                    # Use this row as header
                    df.columns = [str(val) if pd.notna(val) else f'Column_{j}' for j, val in enumerate(row)]
                    # Remove the header row from data
                    df = df.drop(df.index[i]).reset_index(drop=True)
                    break
            
            return df
        except:
            return df

    @staticmethod
    def process_file_with_openai_mapping(file_path: str, sheet_name: str = None, sample_size: int = 50) -> Dict[str, Any]:
        """
        Process Excel file using OpenAI-based column mapping
        
        Args:
            file_path: Path to Excel file
            sheet_name: Specific sheet to process (if None, auto-detect best sheet)
            sample_size: Number of sample rows to send to OpenAI
            
        Returns:
            Dictionary containing mapped data and mapping information
        """
        try:
            print(f"[INFO] Processing file: {file_path}")
            
            # Read Excel file
            sheets_data = ExcelProcessor.read_excel_file(file_path, sheet_name)
            
            if sheet_name:
                df = sheets_data[sheet_name]['data']
                sheet_used = sheet_name
            else:
                # Auto-detect best sheet
                best_sheet_info = ExcelProcessor.detect_best_sheet_for_analysis(file_path)
                sheet_used = best_sheet_info['best_sheet']
                df = sheets_data[sheet_used]['data']
            
            print(f"Processing sheet: {sheet_used}")
            print(f"Original columns: {df.columns.tolist()}")
            
            # Initialize OpenAI mapper
            openai_mapper = OpenAIColumnMapper()
            
            # Get column mapping from OpenAI
            mapping = openai_mapper.map_columns_with_openai(df, sample_size)
            print(f"OpenAI mapping result: {mapping}")
            
            # Apply mapping to DataFrame
            df_mapped = openai_mapper.apply_mapping(df, mapping)
            
            # Validate mapping
            validation = openai_mapper.validate_mapping(df, mapping)
            print(f"Mapping validation: {validation}")
            
            # Clean the mapped data
            df_mapped = ExcelProcessor.clean_mapped_data(df_mapped)
            
            # Force garbage collection to free memory
            gc.collect()
            
            return {
                "original_data": df,
                "mapped_data": df_mapped,
                "mapping": mapping,
                "validation": validation,
                "sheet_used": sheet_used,
                "original_columns": df.columns.tolist(),
                "mapped_columns": df_mapped.columns.tolist(),
                "total_rows": len(df_mapped)
            }
        
        except Exception as e:
            raise Exception(f"Error processing file with OpenAI mapping: {str(e)}")

    @staticmethod
    def clean_mapped_data(df: pd.DataFrame) -> pd.DataFrame:
        """Clean and preprocess mapped data"""
        try:
            df_clean = df.copy()
            
            # Remove completely empty rows
            df_clean = df_clean.dropna(how='all')
            
            # Clean numeric columns
            numeric_columns = ['Sales Count', 'Sales Value (usd)', 'SOH']
            for col in numeric_columns:
                if col in df_clean.columns:
                    # Replace non-numeric values with 0
                    df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce').fillna(0)
            
            # Clean text columns
            text_columns = ['Category or product name', 'Country', 'Description', 'Type']
            for col in text_columns:
                if col in df_clean.columns:
                    df_clean[col] = df_clean[col].astype(str).str.strip()
                    df_clean[col] = df_clean[col].replace('nan', 'Unknown')
            
            # Clean year and month columns
            if 'Year' in df_clean.columns:
                df_clean['Year'] = pd.to_numeric(df_clean['Year'], errors='coerce').fillna(0).astype(int)
            if 'Month' in df_clean.columns:
                # Handle both string (Jan, Feb) and numeric (1, 2, 3) month formats
                df_clean['Month'] = ExcelProcessor._normalize_month_column(df_clean['Month'])
            
            return df_clean
        
        except Exception as e:
            print(f"Warning: Data cleaning failed: {str(e)}")
            return df

    @staticmethod
    def _normalize_month_column(month_series: pd.Series) -> pd.Series:
        """Normalize month column to handle both string and numeric formats"""
        try:
            # Month name to number mapping
            month_mapping = {
                'jan': 1, 'january': 1,
                'feb': 2, 'february': 2,
                'mar': 3, 'march': 3,
                'apr': 4, 'april': 4,
                'may': 5,
                'jun': 6, 'june': 6,
                'jul': 7, 'july': 7,
                'aug': 8, 'august': 8,
                'sep': 9, 'september': 9,
                'oct': 10, 'october': 10,
                'nov': 11, 'november': 11,
                'dec': 12, 'december': 12
            }
            
            def normalize_month(value):
                if pd.isna(value):
                    return 0
                
                # Convert to string and lowercase
                value_str = str(value).lower().strip()
                
                # If it's already a number, convert it
                if value_str.isdigit():
                    month_num = int(value_str)
                    return month_num if 1 <= month_num <= 12 else 0
                
                # If it's a month name, map it
                if value_str in month_mapping:
                    return month_mapping[value_str]
                
                # Try to extract number from strings like "Month 1", "1st", etc.
                import re
                numbers = re.findall(r'\d+', value_str)
                if numbers:
                    month_num = int(numbers[0])
                    return month_num if 1 <= month_num <= 12 else 0
                
                return 0
            
            return month_series.apply(normalize_month).astype(int)
        
        except Exception as e:
            print(f"Warning: Month normalization failed: {str(e)}")
            # Fallback: try to convert to numeric
            return pd.to_numeric(month_series, errors='coerce').fillna(0).astype(int)

    @staticmethod
    def filter_data(df: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
        """Filter DataFrame based on provided filters"""
        try:
            filtered_df = df.copy()
            
            for column, value in filters.items():
                if column in filtered_df.columns:
                    if isinstance(value, list):
                        # Multiple values filter (OR condition)
                        filtered_df = filtered_df[filtered_df[column].isin(value)]
                    else:
                        # Single value filter
                        filtered_df = filtered_df[filtered_df[column] == value]
            
            return filtered_df
        except Exception as e:
            raise Exception(f"Error filtering data: {str(e)}")

    @staticmethod
    def convert_to_dict(df: pd.DataFrame, selected_columns: List[str] = None) -> List[Dict[str, Any]]:
        """Convert DataFrame to list of dictionaries"""
        try:
            if selected_columns:
                df = df[selected_columns]
            
            # Replace NaN with None for JSON compatibility
            df = df.where(pd.notnull(df), None)
            
            # Convert numpy types to Python native types for JSON serialization
            df_clean = df.copy()
            for col in df_clean.columns:
                if df_clean[col].dtype == 'int64':
                    df_clean[col] = df_clean[col].astype('int32')
                elif df_clean[col].dtype == 'float64':
                    df_clean[col] = df_clean[col].astype('float32')
                elif df_clean[col].dtype == 'object':
                    # Convert any remaining numpy types in object columns
                    df_clean[col] = df_clean[col].apply(lambda x: int(x) if isinstance(x, np.integer) else float(x) if isinstance(x, np.floating) else x)
            
            return df_clean.to_dict('records')
        except Exception as e:
            raise Exception(f"Error converting data: {str(e)}")

    @staticmethod
    def get_mapped_data_summary(df: pd.DataFrame) -> Dict[str, Any]:
        """Get summary statistics for mapped data"""
        try:
            # Convert numpy types to Python native types for JSON serialization
            df_clean = df.copy()
            for col in df_clean.columns:
                if df_clean[col].dtype == 'int64':
                    df_clean[col] = df_clean[col].astype('int32')
                elif df_clean[col].dtype == 'float64':
                    df_clean[col] = df_clean[col].astype('float32')
            
            summary = {
                "total_rows": int(len(df_clean)),
                "columns": df_clean.columns.tolist(),
                "data_types": df_clean.dtypes.astype(str).to_dict(),
                "null_counts": df_clean.isnull().sum().astype(int).to_dict(),
                "sample_data": ExcelProcessor.convert_to_dict(df_clean.head(5))
            }
            
            # Add numeric column statistics
            numeric_columns = ['Sales Count', 'Sales Value (usd)', 'SOH']
            for col in numeric_columns:
                if col in df_clean.columns:
                    summary[f"{col}_stats"] = {
                        "sum": float(df_clean[col].sum()) if pd.notna(df_clean[col].sum()) else 0,
                        "mean": float(df_clean[col].mean()) if pd.notna(df_clean[col].mean()) else 0,
                        "min": float(df_clean[col].min()) if pd.notna(df_clean[col].min()) else 0,
                        "max": float(df_clean[col].max()) if pd.notna(df_clean[col].max()) else 0,
                        "count": int(df_clean[col].count())
                    }
            
            return summary
            
        except Exception as e:
            return {"error": f"Error generating summary: {str(e)}"}