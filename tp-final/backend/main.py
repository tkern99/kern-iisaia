import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from auth import router as auth_router
from routes.pdks import router as pdks_router
from routes.layouts import router as layouts_router

# Inicializar DB SQLite
init_db()

app = FastAPI(
    title="Educational Layout Simulator API",
    version="1.0.0",
    description="API REST para el simulador de layout educativo (PDK GPDK045 45nm, control de versiones y checkout/checkin)."
)

# 1. Middleware para proteger rutas /api
@app.middleware("http")
async def require_auth_for_api(request: Request, call_next):
    public_paths = [
        "/api/health", 
        "/api/docs", 
        "/api/openapi.json", 
        "/api/auth/login", 
        "/api/logged-out", 
        "/api/me",
        "/login",
        "/callback",
        "/logout",
        "/logged-out"
    ]
    
    path = request.url.path
    if path.startswith("/api") and path not in public_paths:
        user = request.session.get('user') if "session" in request.scope else None
        dev_bypass = os.getenv("DEV_BYPASS_AUTH", "true").lower() == "true"
        if not user and not dev_bypass:
            return JSONResponse(
                status_code=401, 
                content={"error": "Unauthorized. Inicia sesión primero con /login o en el panel de sesión."}
            )
        elif not user and dev_bypass and "session" in request.scope:
            request.session['user'] = {'id': 1, 'email': 'demo@edulayout.org', 'name': 'Demo User'}

    response = await call_next(request)
    return response

# 2. Middleware de Sesión con cookies firmadas (debe ir después para envolver las peticiones)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "edulayout-secret-key-123"),
    max_age=86400,
    https_only=False
)

# 3. Middleware CORS para permitir peticiones desde Vite (puerto 5173 u otros)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir Routers
app.include_router(auth_router)
app.include_router(pdks_router)
app.include_router(layouts_router)

# Aliases de compatibilidad para frontend existente (/api/projects -> /api/layouts)
@app.get("/api/projects")
async def get_projects_alias():
    from routes.layouts import list_layouts
    return await list_layouts()

@app.post("/api/projects")
async def create_project_alias(request: Request):
    from routes.layouts import create_layout, LayoutCreate
    body = await request.json()
    layout = LayoutCreate(name=body.get("name", "Nuevo Layout"), pdk_id=body.get("pdk_id", 1))
    return await create_layout(layout, request)

@app.delete("/api/projects/{id}")
async def delete_project_alias(id: int):
    from routes.layouts import delete_layout
    return await delete_layout(id)

@app.get("/api/projects/{id}/versions")
async def get_project_versions_alias(id: int):
    from routes.layouts import list_layout_versions
    return await list_layout_versions(id)

@app.get("/api/projects/{id}/versions/{version_id}")
async def get_project_version_alias(id: int, version_id: int):
    from routes.layouts import get_layout_version
    return await get_layout_version(id, version_id)


@app.post("/api/projects/{id}/versions")
async def post_project_version_alias(id: int, request: Request):
    from routes.layouts import checkin_layout_version, LayoutVersionCreate
    body = await request.json()
    # Soporta tanto snapshot como data
    data_content = body.get("data") or body.get("snapshot")
    if isinstance(data_content, str):
        import json
        try:
            data_content = json.loads(data_content)
        except Exception:
            data_content = []
    skip_drc = body.get("skip_drc", True)
    ver = LayoutVersionCreate(data=data_content, skip_drc=skip_drc)
    return await checkin_layout_version(id, ver)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "pdk": "GPDK045", "node": "45nm", "architecture": "FastAPI"}

# Montar frontend estático si existe (para producción en un solo proceso)
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3001"))
    print(f"Iniciando EduLayout Backend (FastAPI GPDK045 45nm) en puerto {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
