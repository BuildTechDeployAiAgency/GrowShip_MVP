"""
Order Routes for GrowShip API
Handles CRUD operations for orders
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
import os
from datetime import datetime
import json

from ..models.schemas import (
    Order,
    OrderCreate,
    OrderUpdate,
    OrderListResponse,
    OrderSummaryStats,
    OrderFilterRequest
)

# Initialize router
router = APIRouter(
    prefix="/api/v1/orders",
    tags=["orders"]
)

# Supabase client initialization
from ..services.supabase_service import SupabaseService

def get_supabase_service():
    """Dependency to get Supabase service instance"""
    return SupabaseService()


@router.get("/", response_model=OrderListResponse)
async def list_orders(
    user_id: str = Query(..., description="User ID"),
    organization_id: str = Query(..., description="Organization ID"),
    limit: int = Query(50, ge=1, le=100, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    order_status: Optional[str] = Query(None, description="Filter by order status"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status"),
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    date_from: Optional[str] = Query(None, description="Filter orders from this date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter orders to this date (ISO format)"),
    search: Optional[str] = Query(None, description="Search in order number, customer name"),
    supabase: SupabaseService = Depends(get_supabase_service)
):
    """
    List orders with filtering and pagination
    """
    try:
        print(f"[INFO] Fetching orders for user: {user_id}, org: {organization_id}")
        
        # Build query
        query = supabase.client.table("orders").select("*")
        
        # Filter by organization
        query = query.eq("organization_id", organization_id)
        
        # Apply filters
        if order_status:
            query = query.eq("order_status", order_status)
        
        if payment_status:
            query = query.eq("payment_status", payment_status)
        
        if customer_id:
            query = query.eq("customer_id", customer_id)
        
        if date_from:
            query = query.gte("order_date", date_from)
        
        if date_to:
            query = query.lte("order_date", date_to)
        
        if search:
            # Full-text search in order_number and customer_name
            query = query.or_(
                f"order_number.ilike.%{search}%,"
                f"customer_name.ilike.%{search}%"
            )
        
        # Count total records (before pagination)
        count_result = query.execute()
        total = len(count_result.data) if count_result.data else 0
        
        # Apply pagination and ordering
        query = query.order("order_date", desc=True)
        query = query.range(offset, offset + limit - 1)
        
        # Execute query
        result = query.execute()
        
        orders_data = result.data if result.data else []
        
        # Parse JSONB fields
        for order in orders_data:
            if order.get('items') and isinstance(order['items'], str):
                order['items'] = json.loads(order['items'])
            
            # Build customer object from individual fields
            order['customer'] = {
                'customer_id': order.get('customer_id'),
                'customer_name': order.get('customer_name'),
                'customer_email': order.get('customer_email'),
                'customer_phone': order.get('customer_phone'),
                'customer_type': order.get('customer_type')
            }
            
            # Build shipping object if shipping data exists
            if order.get('shipping_address_line1'):
                order['shipping'] = {
                    'address_line1': order.get('shipping_address_line1'),
                    'address_line2': order.get('shipping_address_line2'),
                    'city': order.get('shipping_city'),
                    'state': order.get('shipping_state'),
                    'zip_code': order.get('shipping_zip_code'),
                    'country': order.get('shipping_country'),
                    'shipping_method': order.get('shipping_method'),
                    'tracking_number': order.get('tracking_number'),
                    'estimated_delivery_date': order.get('estimated_delivery_date'),
                    'actual_delivery_date': order.get('actual_delivery_date')
                }
        
        print(f"[SUCCESS] Retrieved {len(orders_data)} orders (total: {total})")
        
        return OrderListResponse(
            data=orders_data,
            total=total,
            offset=offset,
            limit=limit
        )
        
    except Exception as e:
        print(f"[ERROR] Error fetching orders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching orders: {str(e)}")


@router.get("/{order_id}", response_model=Order)
async def get_order(
    order_id: str,
    user_id: str = Query(..., description="User ID"),
    organization_id: str = Query(..., description="Organization ID"),
    supabase: SupabaseService = Depends(get_supabase_service)
):
    """
    Get a specific order by ID
    """
    try:
        print(f"[INFO] Fetching order: {order_id}")
        
        result = supabase.client.table("orders")\
            .select("*")\
            .eq("id", order_id)\
            .eq("organization_id", organization_id)\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order = result.data
        
        # Parse JSONB fields
        if order.get('items') and isinstance(order['items'], str):
            order['items'] = json.loads(order['items'])
        
        # Build customer object
        order['customer'] = {
            'customer_id': order.get('customer_id'),
            'customer_name': order.get('customer_name'),
            'customer_email': order.get('customer_email'),
            'customer_phone': order.get('customer_phone'),
            'customer_type': order.get('customer_type')
        }
        
        # Build shipping object
        if order.get('shipping_address_line1'):
            order['shipping'] = {
                'address_line1': order.get('shipping_address_line1'),
                'address_line2': order.get('shipping_address_line2'),
                'city': order.get('shipping_city'),
                'state': order.get('shipping_state'),
                'zip_code': order.get('shipping_zip_code'),
                'country': order.get('shipping_country'),
                'shipping_method': order.get('shipping_method'),
                'tracking_number': order.get('tracking_number'),
                'estimated_delivery_date': order.get('estimated_delivery_date'),
                'actual_delivery_date': order.get('actual_delivery_date')
            }
        
        print(f"[SUCCESS] Order retrieved: {order_id}")
        return order
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error fetching order: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching order: {str(e)}")


@router.post("/", response_model=Order)
async def create_order(
    order: OrderCreate,
    supabase: SupabaseService = Depends(get_supabase_service)
):
    """
    Create a new order
    """
    try:
        print(f"[INFO] Creating new order: {order.order_number}")
        
        # Prepare order data for insertion
        order_data = {
            "order_number": order.order_number,
            "order_date": order.order_date,
            "user_id": order.user_id,
            "organization_id": order.organization_id,
            
            # Customer fields (flattened)
            "customer_id": order.customer.customer_id,
            "customer_name": order.customer.customer_name,
            "customer_email": order.customer.customer_email,
            "customer_phone": order.customer.customer_phone,
            "customer_type": order.customer.customer_type,
            
            # Items as JSONB
            "items": json.dumps([item.dict() for item in order.items]),
            
            # Financial details
            "subtotal": float(order.subtotal),
            "discount_total": float(order.discount_total) if order.discount_total else 0.0,
            "tax_total": float(order.tax_total) if order.tax_total else 0.0,
            "shipping_cost": float(order.shipping_cost) if order.shipping_cost else 0.0,
            "total_amount": float(order.total_amount),
            "currency": order.currency or "USD",
            
            # Payment
            "payment_method": order.payment_method,
            "payment_status": order.payment_status or "pending",
            
            # Status
            "order_status": order.order_status or "pending",
            
            # Additional
            "notes": order.notes,
            "tags": order.tags,
            
            # Audit
            "created_by": order.user_id,
        }
        
        # Add shipping fields if provided
        if order.shipping:
            order_data.update({
                "shipping_address_line1": order.shipping.address_line1,
                "shipping_address_line2": order.shipping.address_line2,
                "shipping_city": order.shipping.city,
                "shipping_state": order.shipping.state,
                "shipping_zip_code": order.shipping.zip_code,
                "shipping_country": order.shipping.country,
                "shipping_method": order.shipping.shipping_method,
                "tracking_number": order.shipping.tracking_number,
                "estimated_delivery_date": order.shipping.estimated_delivery_date,
                "actual_delivery_date": order.shipping.actual_delivery_date,
            })
        
        # Insert order
        result = supabase.client.table("orders").insert(order_data).execute()
        
        if not result.data:
            raise Exception("Failed to create order")
        
        created_order = result.data[0]
        
        # Parse items back to list
        if created_order.get('items') and isinstance(created_order['items'], str):
            created_order['items'] = json.loads(created_order['items'])
        
        # Build customer object
        created_order['customer'] = {
            'customer_id': created_order.get('customer_id'),
            'customer_name': created_order.get('customer_name'),
            'customer_email': created_order.get('customer_email'),
            'customer_phone': created_order.get('customer_phone'),
            'customer_type': created_order.get('customer_type')
        }
        
        # Build shipping object
        if created_order.get('shipping_address_line1'):
            created_order['shipping'] = {
                'address_line1': created_order.get('shipping_address_line1'),
                'address_line2': created_order.get('shipping_address_line2'),
                'city': created_order.get('shipping_city'),
                'state': created_order.get('shipping_state'),
                'zip_code': created_order.get('shipping_zip_code'),
                'country': created_order.get('shipping_country'),
                'shipping_method': created_order.get('shipping_method'),
                'tracking_number': created_order.get('tracking_number'),
                'estimated_delivery_date': created_order.get('estimated_delivery_date'),
                'actual_delivery_date': created_order.get('actual_delivery_date')
            }
        
        print(f"[SUCCESS] Order created: {created_order['id']}")
        return created_order
        
    except Exception as e:
        print(f"[ERROR] Error creating order: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating order: {str(e)}")


@router.patch("/{order_id}", response_model=Order)
async def update_order(
    order_id: str,
    order_update: OrderUpdate,
    user_id: str = Query(..., description="User ID"),
    organization_id: str = Query(..., description="Organization ID"),
    supabase: SupabaseService = Depends(get_supabase_service)
):
    """
    Update an existing order
    """
    try:
        print(f"[INFO] Updating order: {order_id}")
        
        # Build update data (only include non-None fields)
        update_data = {
            "updated_by": user_id
        }
        
        if order_update.order_status is not None:
            update_data["order_status"] = order_update.order_status
        
        if order_update.payment_status is not None:
            update_data["payment_status"] = order_update.payment_status
        
        if order_update.notes is not None:
            update_data["notes"] = order_update.notes
        
        if order_update.tags is not None:
            update_data["tags"] = order_update.tags
        
        if order_update.shipping is not None:
            update_data.update({
                "shipping_address_line1": order_update.shipping.address_line1,
                "shipping_address_line2": order_update.shipping.address_line2,
                "shipping_city": order_update.shipping.city,
                "shipping_state": order_update.shipping.state,
                "shipping_zip_code": order_update.shipping.zip_code,
                "shipping_country": order_update.shipping.country,
                "shipping_method": order_update.shipping.shipping_method,
                "tracking_number": order_update.shipping.tracking_number,
                "estimated_delivery_date": order_update.shipping.estimated_delivery_date,
                "actual_delivery_date": order_update.shipping.actual_delivery_date,
            })
        
        # Update order
        result = supabase.client.table("orders")\
            .update(update_data)\
            .eq("id", order_id)\
            .eq("organization_id", organization_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        updated_order = result.data[0]
        
        # Parse items
        if updated_order.get('items') and isinstance(updated_order['items'], str):
            updated_order['items'] = json.loads(updated_order['items'])
        
        # Build customer object
        updated_order['customer'] = {
            'customer_id': updated_order.get('customer_id'),
            'customer_name': updated_order.get('customer_name'),
            'customer_email': updated_order.get('customer_email'),
            'customer_phone': updated_order.get('customer_phone'),
            'customer_type': updated_order.get('customer_type')
        }
        
        # Build shipping object
        if updated_order.get('shipping_address_line1'):
            updated_order['shipping'] = {
                'address_line1': updated_order.get('shipping_address_line1'),
                'address_line2': updated_order.get('shipping_address_line2'),
                'city': updated_order.get('shipping_city'),
                'state': updated_order.get('shipping_state'),
                'zip_code': updated_order.get('shipping_zip_code'),
                'country': updated_order.get('shipping_country'),
                'shipping_method': updated_order.get('shipping_method'),
                'tracking_number': updated_order.get('tracking_number'),
                'estimated_delivery_date': updated_order.get('estimated_delivery_date'),
                'actual_delivery_date': updated_order.get('actual_delivery_date')
            }
        
        print(f"[SUCCESS] Order updated: {order_id}")
        return updated_order
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error updating order: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating order: {str(e)}")


@router.delete("/{order_id}")
async def delete_order(
    order_id: str,
    user_id: str = Query(..., description="User ID"),
    organization_id: str = Query(..., description="Organization ID"),
    supabase: SupabaseService = Depends(get_supabase_service)
):
    """
    Delete an order (soft delete by setting status to cancelled)
    """
    try:
        print(f"[INFO] Deleting order: {order_id}")
        
        # Check if order exists and belongs to organization
        check_result = supabase.client.table("orders")\
            .select("id")\
            .eq("id", order_id)\
            .eq("organization_id", organization_id)\
            .execute()
        
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Soft delete: set status to cancelled
        result = supabase.client.table("orders")\
            .update({
                "order_status": "cancelled",
                "updated_by": user_id
            })\
            .eq("id", order_id)\
            .execute()
        
        print(f"[SUCCESS] Order cancelled: {order_id}")
        return {"message": "Order cancelled successfully", "order_id": order_id}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error deleting order: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting order: {str(e)}")


@router.get("/stats/summary", response_model=OrderSummaryStats)
async def get_order_stats(
    organization_id: str = Query(..., description="Organization ID"),
    date_from: Optional[str] = Query(None, description="Filter from this date"),
    date_to: Optional[str] = Query(None, description="Filter to this date"),
    supabase: SupabaseService = Depends(get_supabase_service)
):
    """
    Get order statistics and summary
    """
    try:
        print(f"[INFO] Fetching order stats for organization: {organization_id}")
        
        # Build base query
        query = supabase.client.table("orders").select("*").eq("organization_id", organization_id)
        
        if date_from:
            query = query.gte("order_date", date_from)
        if date_to:
            query = query.lte("order_date", date_to)
        
        result = query.execute()
        orders = result.data if result.data else []
        
        # Calculate statistics
        total_orders = len(orders)
        total_revenue = sum(float(order.get('total_amount', 0)) for order in orders)
        average_order_value = total_revenue / total_orders if total_orders > 0 else 0
        
        # Count orders by status
        orders_by_status = {}
        orders_by_payment_status = {}
        
        for order in orders:
            status = order.get('order_status', 'unknown')
            orders_by_status[status] = orders_by_status.get(status, 0) + 1
            
            payment = order.get('payment_status', 'unknown')
            orders_by_payment_status[payment] = orders_by_payment_status.get(payment, 0) + 1
        
        # Get top customers
        customer_stats = {}
        for order in orders:
            customer_id = order.get('customer_id', 'unknown')
            customer_name = order.get('customer_name', 'Unknown')
            
            if customer_id not in customer_stats:
                customer_stats[customer_id] = {
                    'customer_id': customer_id,
                    'customer_name': customer_name,
                    'total_orders': 0,
                    'total_revenue': 0.0
                }
            
            customer_stats[customer_id]['total_orders'] += 1
            customer_stats[customer_id]['total_revenue'] += float(order.get('total_amount', 0))
        
        top_customers = sorted(
            customer_stats.values(),
            key=lambda x: x['total_revenue'],
            reverse=True
        )[:10]
        
        # Get recent orders
        recent_orders = sorted(
            orders,
            key=lambda x: x.get('order_date', ''),
            reverse=True
        )[:10]
        
        # Parse recent orders
        for order in recent_orders:
            if order.get('items') and isinstance(order['items'], str):
                order['items'] = json.loads(order['items'])
            
            order['customer'] = {
                'customer_id': order.get('customer_id'),
                'customer_name': order.get('customer_name'),
                'customer_email': order.get('customer_email'),
                'customer_phone': order.get('customer_phone'),
                'customer_type': order.get('customer_type')
            }
        
        print(f"[SUCCESS] Stats calculated: {total_orders} orders, ${total_revenue:.2f} revenue")
        
        return OrderSummaryStats(
            total_orders=total_orders,
            total_revenue=total_revenue,
            average_order_value=average_order_value,
            orders_by_status=orders_by_status,
            orders_by_payment_status=orders_by_payment_status,
            top_customers=top_customers,
            recent_orders=recent_orders
        )
        
    except Exception as e:
        print(f"[ERROR] Error fetching order stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching order stats: {str(e)}")


@router.post("/filter", response_model=OrderListResponse)
async def filter_orders(
    filter_request: OrderFilterRequest,
    user_id: str = Query(..., description="User ID"),
    organization_id: str = Query(..., description="Organization ID"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    supabase: SupabaseService = Depends(get_supabase_service)
):
    """
    Advanced filtering of orders
    """
    try:
        print(f"[INFO] Filtering orders with custom criteria")
        
        query = supabase.client.table("orders").select("*").eq("organization_id", organization_id)
        
        # Apply filters from request body
        if filter_request.order_status:
            query = query.in_("order_status", filter_request.order_status)
        
        if filter_request.payment_status:
            query = query.in_("payment_status", filter_request.payment_status)
        
        if filter_request.customer_id:
            query = query.eq("customer_id", filter_request.customer_id)
        
        if filter_request.date_from:
            query = query.gte("order_date", filter_request.date_from)
        
        if filter_request.date_to:
            query = query.lte("order_date", filter_request.date_to)
        
        if filter_request.min_amount:
            query = query.gte("total_amount", filter_request.min_amount)
        
        if filter_request.max_amount:
            query = query.lte("total_amount", filter_request.max_amount)
        
        if filter_request.search_query:
            query = query.or_(
                f"order_number.ilike.%{filter_request.search_query}%,"
                f"customer_name.ilike.%{filter_request.search_query}%"
            )
        
        # Get count
        count_result = query.execute()
        total = len(count_result.data) if count_result.data else 0
        
        # Apply pagination
        query = query.order("order_date", desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        
        orders_data = result.data if result.data else []
        
        # Parse orders
        for order in orders_data:
            if order.get('items') and isinstance(order['items'], str):
                order['items'] = json.loads(order['items'])
            
            order['customer'] = {
                'customer_id': order.get('customer_id'),
                'customer_name': order.get('customer_name'),
                'customer_email': order.get('customer_email'),
                'customer_phone': order.get('customer_phone'),
                'customer_type': order.get('customer_type')
            }
            
            if order.get('shipping_address_line1'):
                order['shipping'] = {
                    'address_line1': order.get('shipping_address_line1'),
                    'address_line2': order.get('shipping_address_line2'),
                    'city': order.get('shipping_city'),
                    'state': order.get('shipping_state'),
                    'zip_code': order.get('shipping_zip_code'),
                    'country': order.get('shipping_country'),
                    'shipping_method': order.get('shipping_method'),
                    'tracking_number': order.get('tracking_number'),
                    'estimated_delivery_date': order.get('estimated_delivery_date'),
                    'actual_delivery_date': order.get('actual_delivery_date')
                }
        
        print(f"[SUCCESS] Filtered {len(orders_data)} orders")
        
        return OrderListResponse(
            data=orders_data,
            total=total,
            offset=offset,
            limit=limit,
            filters=filter_request.dict(exclude_none=True)
        )
        
    except Exception as e:
        print(f"[ERROR] Error filtering orders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error filtering orders: {str(e)}")
