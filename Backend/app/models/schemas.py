from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union

class ExcelUploadResponse(BaseModel):
    filename: str
    sheets: List[str]
    message: str

class SheetDataResponse(BaseModel):
    sheet_name: str
    data: List[Dict[str, Any]]
    columns: List[str]
    total_rows: int

class FilterRequest(BaseModel):
    filters: Dict[str, Any] = {}
    columns: Optional[List[str]] = None

class ColumnMappingResponse(BaseModel):
    filename: str
    sheet_used: str
    mapping: Dict[str, str]
    validation: Dict[str, Any]
    original_columns: List[str]
    mapped_columns: List[str]
    total_rows: int
    mapped_data_sample: List[Dict[str, Any]]
    message: str

class MappedDataResponse(BaseModel):
    filename: str
    sheet_used: str
    mapping: Dict[str, str]
    validation: Dict[str, Any]
    data: List[Dict[str, Any]]
    columns: List[str]
    total_rows: int
    offset: int
    limit: int

class MappedDataSummaryResponse(BaseModel):
    filename: str
    sheet_used: str
    mapping: Dict[str, str]
    validation: Dict[str, Any]
    summary: Dict[str, Any]