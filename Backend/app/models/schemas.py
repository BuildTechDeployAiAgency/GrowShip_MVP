from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from decimal import Decimal

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

# ==================== Order Schemas ====================

class OrderItem(BaseModel):
    """Order line item schema"""
    product_id: Optional[str] = None
    product_name: str
    product_sku: Optional[str] = None
    category: Optional[str] = None
    quantity: int
    unit_price: float
    discount_percent: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    tax_percent: Optional[float] = 0.0
    tax_amount: Optional[float] = 0.0
    line_total: float
    notes: Optional[str] = None

class OrderCustomer(BaseModel):
    """Customer information for order"""
    customer_id: Optional[str] = None
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_type: Optional[str] = None  # e.g., "retail", "wholesale", "distributor"

class OrderShipping(BaseModel):
    """Shipping information for order"""
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str
    shipping_method: Optional[str] = None
    tracking_number: Optional[str] = None
    estimated_delivery_date: Optional[str] = None
    actual_delivery_date: Optional[str] = None

class OrderBase(BaseModel):
    """Base order schema"""
    order_number: str
    order_date: str
    customer: OrderCustomer
    items: List[OrderItem]
    shipping: Optional[OrderShipping] = None
    subtotal: float
    discount_total: Optional[float] = 0.0
    tax_total: Optional[float] = 0.0
    shipping_cost: Optional[float] = 0.0
    total_amount: float
    currency: Optional[str] = "USD"
    payment_method: Optional[str] = None
    payment_status: Optional[str] = "pending"  # pending, paid, failed, refunded
    order_status: Optional[str] = "pending"  # pending, confirmed, processing, shipped, delivered, cancelled
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class OrderCreate(OrderBase):
    """Schema for creating a new order"""
    user_id: str
    organization_id: str

class OrderUpdate(BaseModel):
    """Schema for updating an order"""
    order_status: Optional[str] = None
    payment_status: Optional[str] = None
    shipping: Optional[OrderShipping] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class Order(OrderBase):
    """Complete order schema with database fields"""
    id: str
    user_id: str
    organization_id: str
    created_at: str
    updated_at: str
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

class OrderListResponse(BaseModel):
    """Response schema for listing orders"""
    data: List[Order]
    total: int
    offset: int
    limit: int
    filters: Optional[Dict[str, Any]] = None

class OrderSummaryStats(BaseModel):
    """Order summary statistics"""
    total_orders: int
    total_revenue: float
    average_order_value: float
    orders_by_status: Dict[str, int]
    orders_by_payment_status: Dict[str, int]
    top_customers: List[Dict[str, Any]]
    recent_orders: List[Order]

class OrderFilterRequest(BaseModel):
    """Filter request for orders"""
    order_status: Optional[List[str]] = None
    payment_status: Optional[List[str]] = None
    customer_id: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    search_query: Optional[str] = None  # Search in order_number, customer_name, etc.