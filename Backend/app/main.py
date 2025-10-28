from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
# from app.routes import excel_routes
from app.routes import excel_routes
# from app.routes import excel_routes, pdf_routes

app = FastAPI(
    title="Data Extractor API",
    description="API to extract data from Excel and PDF files using Pandas and AI mapping",
    version="1.0.0"
)

# Get allowed origins from environment variable or use default
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# CORS middleware with production-ready configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://growship-red.vercel.app",  # Your Vercel frontend
        "https://*.vercel.app",  # All Vercel deployments
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight response for 1 hour
)

# Include routes
app.include_router(excel_routes.router, prefix="/api/v1/excel", tags=["excel"])
# app.include_router(pdf_routes.router, prefix="/api/v1/pdf", tags=["pdf"])

@app.get("/")
async def root():
    return {"message": "Data Extractor API is running! Supports Excel and PDF files."}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Data Extractor API"}

@app.get("/cors-info")
async def cors_info():
    """Debug endpoint to check CORS configuration"""
    return {
        "allowed_origins": ALLOWED_ORIGINS,
        "environment": os.getenv("ENVIRONMENT", "development"),
        "cors_configured": True
    }

@app.get("/debug/supabase")
async def debug_supabase():
    """Debug endpoint to check Supabase configuration"""
    try:
        from app.services.supabase_service import SupabaseService
        supabase_service = SupabaseService()
        
        # Check if client is properly initialized
        client_status = "initialized" if supabase_service.client else "not_initialized"
        
        return {
            "supabase_url_configured": bool(os.getenv("SUPABASE_URL")),
            "supabase_key_configured": bool(os.getenv("SUPABASE_ANON_KEY")),
            "client_status": client_status,
            "proxy_env_vars": {
                var: os.getenv(var) for var in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
            }
        }
    except Exception as e:
        return {
            "error": str(e),
            "supabase_url_configured": bool(os.getenv("SUPABASE_URL")),
            "supabase_key_configured": bool(os.getenv("SUPABASE_ANON_KEY"))
        }

@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle OPTIONS requests for CORS preflight"""
    return {"message": "OK"}