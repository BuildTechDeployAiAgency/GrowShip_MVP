import pandas as pd
from typing import Dict, List, Optional
import json
import os

class ColumnMapper:
    # Pre-defined mapping configurations for common file types
    PREDEFINED_MAPPINGS = {
        "superstore": {
            "Product Name": ["product_name", "product name", "category"],
            "Sub-Category": ["sub_category", "sub-category"],
            "Sales": ["sales", "sales value", "revenue"],
            "Profit": ["profit"],
            "Quantity": ["quantity", "qty", "vol", "volume"],
            "Customer Name": ["customer_name", "customer name"],
            "Country": ["country"],
            "Region": ["region"],
            "Market": ["market"],
            "Shipping Cost": ["shipping_cost", "shipping cost"],
            "Order Date": ["order_date", "order date", "date"],
            "Year": ["year"],
            "Month": ["month"]
        },
        "sales_report": {
            "Product Name": ["item description", "product name", "item", "category"],
            "Sales": ["sales value (usd)", "sales value (lc)", "sales", "revenue"],
            "Quantity": ["soh (vol)", "quantity", "qty", "volume"],
            "Country": ["country"],
            "Year": ["year"],
            "Month": ["month"],
            "SKU": ["barcode", "sku ean", "sku"]
        },
        "siso_sheet": {
            "Product Name": ["item description", "product name", "item", "category"],
            "Sales": ["sales value (usd)", "sales value (lc)", "sales", "revenue"],
            "Quantity": ["ims", "soh (vol)", "quantity", "qty", "volume"],
            "Country": ["country"],
            "Year": ["year"],
            "Month": ["month"],
            "SKU": ["barcode", "sku ean", "sku"],
            "PTT": ["ptt"],
            "Exchange Rate": ["exchange rate"]
        },
        "q1_sheet": {
            "Product Name": ["item description", "product name", "item", "category"],
            "Sales": ["sales value (usd)", "sales value (lc)", "sales", "revenue"],
            "Quantity": ["ims", "soh (vol)", "quantity", "qty", "volume"],
            "Country": ["country"],
            "Year": ["year"],
            "Month": ["month"],
            "SKU": ["barcode", "sku ean", "sku"],
            "PTT": ["ptt"],
            "Exchange Rate": ["exchange rate"]
        },
        "raw_sheet": {
            "Product Name": ["item description", "product name", "item", "category"],
            "Sales": ["Sales Value (USD)", "sales value (lc)", "sales", "revenue"],
            "Quantity": ["ims", "soh (vol)", "quantity", "qty", "volume"],
            "Country": ["country"],
            "PTT": ["ptt"],
            "Exchange Rate": ["exchange rate"],
            "Year": ["year"],
            "Month": ["month"],
            "SKU": ["barcode", "sku ean", "sku"],
        }
    }
    
    @staticmethod
    def detect_file_type(df: pd.DataFrame, sheet_name: str = None) -> str:
        """Auto-detect file type based on column patterns and sheet name"""
        columns_lower = [col.lower() for col in df.columns]
        
        # Check sheet name first
        if sheet_name:
            sheet_lower = sheet_name.lower()
            if 'siso' in sheet_lower:
                return "siso_sheet"
            elif 'q1' in sheet_lower:
                return "q1_sheet"
            elif 'raw' in sheet_lower:
                return "raw_sheet"
        
        # Check for Superstore pattern
        superstore_keywords = ['product_name', 'category', 'sub_category', 'segment']
        if any(keyword in ' '.join(columns_lower) for keyword in superstore_keywords):
            return "superstore"
        
        # Check for Sales Report pattern
        sales_report_keywords = ['barcode', 'sku ean', 'item description', 'sales value']
        if any(keyword in ' '.join(columns_lower) for keyword in sales_report_keywords):
            return "sales_report"
        
        # Check for SISO/Q1/Raw pattern
        siso_keywords = ['ims', 'soh (vol)', 'ptt', 'exchange rate', 'type', 'size']
        if any(keyword in ' '.join(columns_lower) for keyword in siso_keywords):
            return "siso_sheet"
        
        return "unknown"
    
    @staticmethod
    def map_columns(df: pd.DataFrame, mapping_name: Optional[str] = None, sheet_name: str = None) -> pd.DataFrame:
        """Map columns based on detected or specified mapping"""
        df_mapped = df.copy()
        
        # Detect mapping type if not specified
        if not mapping_name:
            mapping_name = ColumnMapper.detect_file_type(df, sheet_name)
        
        if mapping_name not in ColumnMapper.PREDEFINED_MAPPINGS:
            print(f"Warning: No mapping found for '{mapping_name}'. Using flexible mapping.")
            mapping_name = "flexible"
        
        # Apply mapping
        if mapping_name == "flexible":
            df_mapped = ColumnMapper.flexible_mapping(df_mapped)
        else:
            df_mapped = ColumnMapper.apply_predefined_mapping(df_mapped, mapping_name)
        
        print(f"Applied mapping: {mapping_name}")
        print(f"Original columns: {df.columns.tolist()}")
        print(f"Mapped columns: {[col for col in df_mapped.columns if col in ColumnMapper.get_standard_columns()]}")
        
        return df_mapped
    
    @staticmethod
    def apply_predefined_mapping(df: pd.DataFrame, mapping_name: str) -> pd.DataFrame:
        """Apply predefined column mapping"""
        mapping = ColumnMapper.PREDEFINED_MAPPINGS.get(mapping_name, {})
        df_mapped = df.copy()
        
        for standard_name, source_names in mapping.items():
            for source_name in source_names:
                if source_name in df_mapped.columns:
                    df_mapped[standard_name] = df_mapped[source_name]
                    break
        
        return df_mapped
    
    @staticmethod
    def flexible_mapping(df: pd.DataFrame) -> pd.DataFrame:
        """Flexible mapping based on column name patterns with improved detection"""
        df_mapped = df.copy()
        
        # Simple and effective pattern matching
        patterns = {
            'Product Name': ['product', 'item', 'description', 'name', 'sku', 'ean', 'barcode', 'category'],
            'Category': ['category', 'type', 'group', 'class'],
            'Sales': ['sales', 'revenue', 'value', 'amount', 'earning', 'lc', 'usd', 'local currency'],
            'Quantity': ['quantity', 'qty', 'volume', 'vol', 'soh', 'ims', 'count', 'units'],
            'Profit': ['profit', 'margin', 'gain', 'net'],
            'Country': ['country', 'nation', 'region', 'market'],
            'Year': ['year', 'yr'],
            'Month': ['month', 'mon'],
            'Customer Name': ['customer', 'client', 'buyer'],
            'Price': ['price', 'cost', 'rate', 'ptt', 'unit price'],
            'Sub-Category': ['sub', 'subcategory', 'sub-category', 'subtype'],
            'Size': ['size', 'sz'],
            'Exchange Rate': ['exchange', 'rate', 'conversion'],
            'Shipping Cost': ['shipping', 'delivery', 'freight', 'transport'],
            'Order Date': ['date', 'order', 'created', 'timestamp'],
            'Segment': ['segment', 'group', 'tier']
        }
        
        # Map columns based on patterns FIRST
        for standard_name, keywords in patterns.items():
            for col in df.columns:
                col_lower = col.lower().strip()
                if any(keyword in col_lower for keyword in keywords):
                    if standard_name not in df_mapped.columns:
                        df_mapped[standard_name] = df_mapped[col]
                        print(f"Mapped '{col}' -> '{standard_name}'")
                        break
        
        # ENHANCED: Force Category to Product Name mapping if no Product Name found
        if 'Category' in df_mapped.columns and 'Product Name' not in df_mapped.columns:
            print("Attempting to map Category -> Product Name (forced mapping)")
            df_mapped['Product Name'] = df_mapped['Category']
            
            # Try to find actual category from data patterns
            category_found = False
            for col in df.columns:
                if col != 'Category' and col not in df_mapped.columns:
                    col_data = df[col].dropna().head(5)
                    if len(col_data) > 0:
                        # Check for category-like patterns (shorter, more generic terms)
                        category_like = 0
                        for val in col_data:
                            val_str = str(val).lower().strip()
                            # Common category terms in your data
                            if any(term in val_str for term in ['nappies', 'pullup', 'wipes', 'skin care', 'swim', 'travel', 'night pants', 'diaper']):
                                category_like += 1
                        
                        if category_like >= 2:  # At least 2 matches
                            df_mapped['Category'] = df[col]
                            print(f"Mapped '{col}' -> 'Category' (category pattern match: {category_like}/5)")
                            category_found = True
                            break
            
            if not category_found:
                # If no real category found, set a default
                df_mapped['Category'] = 'General'
                print("No category column found, setting default 'General' category")
        
        # ENHANCED: Handle unnamed columns more aggressively for product data
        for col in df.columns:
            col_lower = str(col).lower()
            
            # If we still don't have Product Name, check any column with product-like data
            if 'Product Name' not in df_mapped.columns and not col_lower.startswith('unnamed'):
                sample_data = df[col].dropna().head(10)
                if len(sample_data) > 0 and sample_data.dtype == 'object':
                    product_indicators = 0
                    for val in sample_data:
                        val_str = str(val).lower()
                        # Expanded product indicators based on your data
                        if any(keyword in val_str for keyword in [
                            'pureborn', 'size', 'singl', 'valpk', 'monthly', 'nappies', 
                            'pullup', 'wipes', 'skin', 'swim', 'travel', 'night', 'pants',
                            'nb', 'sz', 'master', 'double', 'single'
                        ]):
                            product_indicators += 1
                    
                    # Lower threshold for mapping
                    if product_indicators >= 3:  # Reduced from 30% to just 3 matches
                        df_mapped['Product Name'] = df_mapped[col]
                        print(f"Mapped '{col}' -> 'Product Name' (product data pattern: {product_indicators}/10 matches)")
                        break
        
        return df_mapped

    
    @staticmethod
    def get_standard_columns() -> List[str]:
        """Get list of all standard column names"""
        standard_columns = set()
        for mapping in ColumnMapper.PREDEFINED_MAPPINGS.values():
            standard_columns.update(mapping.keys())
        return list(standard_columns)
    
    @staticmethod
    def validate_mapping(df: pd.DataFrame) -> Dict:
        """Validate if essential columns are available after mapping"""
        essential_columns = ['Product Name', 'Sales']
        available_columns = [col for col in essential_columns if col in df.columns]
        
        return {
            "has_essential_columns": len(available_columns) >= 1,
            "available_standard_columns": [col for col in ColumnMapper.get_standard_columns() if col in df.columns],
            "missing_essential": [col for col in essential_columns if col not in df.columns],
            "original_columns": df.columns.tolist()
        }