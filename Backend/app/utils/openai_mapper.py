import openai
import pandas as pd
import json
from typing import Dict, List, Any, Optional
import os
from dotenv import load_dotenv

load_dotenv()

class OpenAIColumnMapper:
    """OpenAI-based column mapping for Excel/CSV data"""
    
    # Required columns for mapping
    REQUIRED_COLUMNS = [
        "Product Name",
        "Country", 
        "Year",
        "Month",
        "Sales Count",
        "Sales Value (usd)",
        "SOH",
        "Description",
        "Type"
    ]
    
    def __init__(self):
        """Initialize OpenAI client"""
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is not set")
            
            # Try to initialize with the new API first
            try:
                self.client = openai.OpenAI(api_key=api_key)
                self.use_new_api = True
                print(f"[INFO] OpenAI client initialized with new API")
            except Exception as new_api_error:
                print(f"[WARNING] New API failed: {new_api_error}")
                # Fallback to old API
                openai.api_key = api_key
                self.client = openai
                self.use_new_api = False
                print(f"[INFO] OpenAI client initialized with old API")
            
        except Exception as e:
            print(f"[ERROR] Failed to initialize OpenAI client: {str(e)}")
            raise Exception(f"OpenAI client initialization failed: {str(e)}")
    
    def map_columns_with_openai(self, df: pd.DataFrame, sample_size: int = 50) -> Dict[str, str]:
        """
        Use OpenAI to map columns to required format
        
        Args:
            df: DataFrame with original data
            sample_size: Number of sample rows to send to OpenAI
            
        Returns:
            Dictionary mapping original columns to required columns
        """
        try:
            # Prepare sample data for OpenAI
            sample_data = self._prepare_sample_data(df, sample_size)
            print(f"Sample data: {sample_data}")
            # Create prompt for OpenAI
            prompt = self._create_mapping_prompt(sample_data)
            print(f"Prompt: {prompt}")
            # Call OpenAI API using appropriate format based on client type
            if self.use_new_api:
                response = self.client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {
                            "role": "system", 
                            "content": "You are an expert data analyst specializing in column mapping for sales data. Your task is to map columns from uploaded Excel/CSV files to a standardized format."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.1,
                    max_tokens=2000
                )
                content = response.choices[0].message.content
            else:
                response = self.client.ChatCompletion.create(
                    model="gpt-4",
                    messages=[
                        {
                            "role": "system", 
                            "content": "You are an expert data analyst specializing in column mapping for sales data. Your task is to map columns from uploaded Excel/CSV files to a standardized format."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.1,
                    max_tokens=2000
                )
                content = response.choices[0].message.content
            print(f"Response: {response}")
            # Parse response
            mapping_result = self._parse_openai_response(content)
            print(f"Mapping result: {mapping_result}")
            return mapping_result
            
        except Exception as e:
            print(f"Error in OpenAI column mapping: {str(e)}")
            # Fallback to basic mapping
            return self._fallback_mapping(df)
    
    def _prepare_sample_data(self, df: pd.DataFrame, sample_size: int) -> Dict[str, Any]:
        """Prepare sample data for OpenAI analysis"""
        # Get sample rows
        sample_df = df.head(sample_size)
        
        # Convert to dictionary format
        sample_data = {
            "columns": df.columns.tolist(),
            "sample_rows": sample_df.to_dict('records'),
            "data_types": df.dtypes.astype(str).to_dict(),
            "total_rows": len(df)
        }
        
        return sample_data
    
    def _create_mapping_prompt(self, sample_data: Dict[str, Any]) -> str:
        """Create prompt for OpenAI column mapping"""
        
        prompt = f"""
I have uploaded an Excel/CSV file with sales data. I need you to map the columns to a standardized format.

REQUIRED COLUMNS (these are the target columns I need):
{json.dumps(self.REQUIRED_COLUMNS, indent=2)}

ORIGINAL DATA STRUCTURE:
Columns: {sample_data['columns']}
Data Types: {sample_data['data_types']}
Total Rows: {sample_data['total_rows']}

SAMPLE DATA (first few rows):
{json.dumps(sample_data['sample_rows'][:5], indent=2, default=str)}

Please analyze the data and provide a mapping from the original columns to the required columns. 

SPECIFIC MAPPING GUIDELINES:
1. "Product Name" should map to "Category" column (this contains the product names/categories)
2. "Country" should map to columns named "Country", "Nation", "Region", "Market"
3. "Year" should map to columns named "Year", "Yr", containing year data
4. "Month" should map to columns named "Month", "Mon", containing month data (can be numbers 1-12 or month names like Jan, Feb, March, etc.)
5. "Sales Count" should map to quantity/volume columns like "Quantity", "Qty", "Volume", "Count", "Units" - NOT country or other text columns. If no quantity column exists, mark as "NOT_FOUND"
6. "Sales Value (usd)" should map to USD sales columns like "Sales Value (USD)", "Sales Value (usd)", "Sales USD", "Revenue USD", "Amount USD". Look for columns containing "USD", "dollar", "$" or "US" in the name. If no USD column exists, look for the main sales/revenue column.
7. "SOH" should map to stock/inventory columns like "SOH (Vol)", "SOH", "Stock", "Inventory", "IMS"
8. "Description" should map to description columns like "Item Description", "Description", "Details", "Notes"
9. "Type" should map to type/category columns like "Type", "Category", "Group", "Class"

CRITICAL RULES:
- Look for EXACT column name matches first (case-insensitive)
- For "Sales Count", look for quantity/volume columns, NOT text columns like "Country"
- For "Sales Value (usd)", prioritize USD columns over LC (Local Currency) columns
- If no exact match exists, choose the closest semantic match
- If a required column has no suitable match, mark it as "NOT_FOUND"
- Consider data types: numeric columns for counts/values, text columns for names/descriptions

Please respond with a JSON object in this exact format:
{{
    "Product Name": "original_column_name_or_NOT_FOUND",
    "Country": "original_column_name_or_NOT_FOUND", 
    "Year": "original_column_name_or_NOT_FOUND",
    "Month": "original_column_name_or_NOT_FOUND",
    "Sales Count": "original_column_name_or_NOT_FOUND",
    "Sales Value (usd)": "original_column_name_or_NOT_FOUND",
    "SOH": "original_column_name_or_NOT_FOUND",
    "Description": "original_column_name_or_NOT_FOUND",
    "Type": "original_column_name_or_NOT_FOUND"
}}

Only return the JSON object, no additional text.
"""
        return prompt
    
    def _parse_openai_response(self, response_content: str) -> Dict[str, str]:
        """Parse OpenAI response and extract mapping"""
        try:
            # Clean the response content
            response_content = response_content.strip()
            
            # Remove any markdown formatting
            if response_content.startswith("```json"):
                response_content = response_content[7:]
            if response_content.endswith("```"):
                response_content = response_content[:-3]
            
            # Parse JSON
            mapping = json.loads(response_content)
            
            # Validate that all required columns are present
            for required_col in self.REQUIRED_COLUMNS:
                if required_col not in mapping:
                    mapping[required_col] = "NOT_FOUND"
            
            return mapping
            
        except json.JSONDecodeError as e:
            print(f"Error parsing OpenAI response: {str(e)}")
            print(f"Response content: {response_content}")
            return self._create_empty_mapping()
        except Exception as e:
            print(f"Error in response parsing: {str(e)}")
            return self._create_empty_mapping()
    
    def _create_empty_mapping(self) -> Dict[str, str]:
        """Create empty mapping when parsing fails"""
        return {col: "NOT_FOUND" for col in self.REQUIRED_COLUMNS}
    
    def _fallback_mapping(self, df: pd.DataFrame) -> Dict[str, str]:
        """Fallback mapping when OpenAI fails"""
        mapping = {}
        
        # First, try exact matches for common column names
        exact_matches = {
            "Product Name": ["Category", "Product Name", "Product"],
            "Country": ["Country"],
            "Year": ["Year"],
            "Month": ["Month"],
            "Sales Count": ["Quantity", "Qty", "Volume", "Count", "Units", "Sales Count"],
            "Sales Value (usd)": ["Sales Value (USD)", "Sales Value (usd)", "Sales USD", "Revenue USD", "Sales Value", "Earning", "Earnings", "Revenue", "Revenues"],
            "SOH": ["SOH (Vol)", "SOH", "Stock", "Inventory"],
            "Description": ["Item Description", "Description", "Details"],
            "Type": ["Type", "Category", "Group"]
        }
        
        # Special USD detection logic - prioritize USD over LC
        usd_columns = []
        lc_columns = []
        
        for col in df.columns:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in ['usd', 'dollar', '$']):
                usd_columns.append(col)
            elif any(keyword in col_lower for keyword in ['lc', 'local currency', 'local']):
                lc_columns.append(col)
        
        # If we found USD columns, use ONLY USD columns for Sales Value (usd)
        if usd_columns:
            exact_matches["Sales Value (usd)"] = usd_columns
        # Only use LC as fallback if no USD found
        elif lc_columns:
            exact_matches["Sales Value (usd)"] = lc_columns + exact_matches["Sales Value (usd)"]
        
        # Try exact matches first
        for required_col, exact_names in exact_matches.items():
            found = False
            for original_col in df.columns:
                if original_col in exact_names:
                    mapping[required_col] = original_col
                    found = True
                    break
            if not found:
                mapping[required_col] = "NOT_FOUND"
        
        # If we still have NOT_FOUND mappings, try fuzzy matching
        if any(v == "NOT_FOUND" for v in mapping.values()):
            # Enhanced keyword-based mapping with priority order
            column_mapping_rules = {
                "Product Name": [
                    "category", "product name", 
                    "sku", "barcode", "product", "name"
                ],
                "Country": ["country", "nation", "region", "market"],
                "Year": ["year", "yr"],
                "Month": ["month", "mon"],
                "Sales Count": [
                    "quantity", "qty", "volume", "vol", "count", "units", 
                    "sales count", "total quantity"
                ],
                "Sales Value (usd)": [
                    "sales value (usd)", "sales value (usd)", "sales usd", "sales value", "earning", "earnings",
                    "revenue usd", "amount usd", "value usd", "sales value usd", "revenue", "revenues"
                ],
                "SOH": [
                    "soh (vol)", "soh", "stock", "inventory", 
                    "stock on hand", "soh vol"
                ],
                "Description": [
                    "item description", "description", "desc", "details", "notes"
                ],
                "Type": ["type", "category", "group", "class", "sub"]
            }
            
            for required_col, keywords in column_mapping_rules.items():
                if mapping[required_col] == "NOT_FOUND":
                    found = False
                    # Try partial matches
                    for original_col in df.columns:
                        if any(keyword.lower() in original_col.lower() for keyword in keywords):
                            # Special validation for Sales Count - don't map to Country
                            if required_col == "Sales Count" and original_col.lower() == "country":
                                continue
                            mapping[required_col] = original_col
                            found = True
                            break
                    
                    # Special USD detection for Sales Value (usd) if still not found
                    if not found and required_col == "Sales Value (usd)":
                        for original_col in df.columns:
                            col_lower = original_col.lower()
                            # Look for USD indicators
                            if any(indicator in col_lower for indicator in ['usd', 'dollar', '$', 'us']):
                                # Also check if it contains sales-related keywords
                                if any(sales_word in col_lower for sales_word in ['sales', 'revenue', 'value', 'amount', 'earning']):
                                    mapping[required_col] = original_col
                                    found = True
                                    break
                    
                    if not found:
                        mapping[required_col] = "NOT_FOUND"
        
        return mapping
    
    def apply_mapping(self, df: pd.DataFrame, mapping: Dict[str, str]) -> pd.DataFrame:
        """
        Apply the column mapping to the DataFrame
        
        Args:
            df: Original DataFrame
            mapping: Column mapping dictionary
            
        Returns:
            DataFrame with mapped columns
        """
        df_mapped = pd.DataFrame()
        
        for required_col, original_col in mapping.items():
            if original_col != "NOT_FOUND" and original_col in df.columns:
                df_mapped[required_col] = df[original_col]
            else:
                # Create empty column if mapping not found
                df_mapped[required_col] = None
        
        return df_mapped
    
    def validate_mapping(self, df: pd.DataFrame, mapping: Dict[str, str]) -> Dict[str, Any]:
        """
        Validate the mapping results
        
        Args:
            df: Original DataFrame
            mapping: Column mapping dictionary
            
        Returns:
            Validation results
        """
        validation = {
            "mapped_columns": [],
            "missing_columns": [],
            "mapping_quality": "unknown",
            "total_mappings": len(mapping),
            "successful_mappings": 0
        }
        
        for required_col, original_col in mapping.items():
            if original_col != "NOT_FOUND" and original_col in df.columns:
                # Convert numpy types to Python native types for JSON serialization
                non_null_count = int(df[original_col].notna().sum())
                data_type = str(df[original_col].dtype)
                
                validation["mapped_columns"].append({
                    "required": required_col,
                    "original": original_col,
                    "data_type": data_type,
                    "non_null_count": non_null_count
                })
                validation["successful_mappings"] += 1
            else:
                validation["missing_columns"].append(required_col)
        
        # Determine mapping quality
        success_rate = validation["successful_mappings"] / len(mapping)
        if success_rate >= 0.8:
            validation["mapping_quality"] = "excellent"
        elif success_rate >= 0.6:
            validation["mapping_quality"] = "good"
        elif success_rate >= 0.4:
            validation["mapping_quality"] = "fair"
        else:
            validation["mapping_quality"] = "poor"
        
        return validation
