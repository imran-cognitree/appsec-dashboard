from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import close_database_connection
from app.routes import auth_routes, datasets_routes, findings_routes, reports_routes

app = FastAPI(title="Vulnerability Dashboard API")

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_database_connection()

app.include_router(auth_routes.router, prefix="/api")
app.include_router(findings_routes.router, prefix="/api")
app.include_router(reports_routes.router, prefix="/api")
app.include_router(datasets_routes.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Vulnerability Dashboard API"}
