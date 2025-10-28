import uvicorn
import os

if __name__ == "__main__":
    # Get port from environment variable (Heroku sets this)
    port = int(os.getenv("PORT", 8880))
    
    # Determine if we're in production
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=not is_production,  # Disable reload in production
        log_level="info" if is_production else "debug",
        access_log=True,
    )