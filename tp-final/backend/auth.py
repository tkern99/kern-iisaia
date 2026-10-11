import os
import urllib.parse
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import RedirectResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth
from database import get_db_connection

router = APIRouter()

# Configuración de Auth0 usando variables de entorno
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_CLIENT_ID = os.getenv("AUTH0_CLIENT_ID")
AUTH0_CLIENT_SECRET = os.getenv("AUTH0_CLIENT_SECRET")

oauth = OAuth()
if AUTH0_DOMAIN and AUTH0_CLIENT_ID and AUTH0_CLIENT_SECRET:
    oauth.register(
        name='auth0',
        client_id=AUTH0_CLIENT_ID,
        client_secret=AUTH0_CLIENT_SECRET,
        server_metadata_url=f'https://{AUTH0_DOMAIN}/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid profile email'}
    )

def ensure_user_in_db(email: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    if not user:
        cursor.execute("INSERT INTO users (email) VALUES (?)", (email,))
        conn.commit()
        user_id = cursor.lastrowid
    else:
        user_id = user["id"]
    conn.close()
    return user_id

@router.get('/login')
async def login(request: Request):
    """
    GET /login: Redirige (302) a Auth0 o inicia sesión local de desarrollo si no hay credenciales Auth0.
    """
    if AUTH0_DOMAIN and AUTH0_CLIENT_ID and AUTH0_CLIENT_SECRET and hasattr(oauth, 'auth0'):
        redirect_uri = str(request.url_for('auth_callback'))
        return await oauth.auth0.authorize_redirect(request, redirect_uri)
    
    # Modo Local / Dev: Inicia sesión automáticamente con usuario demo
    demo_email = "demo@edulayout.org"
    user_id = ensure_user_in_db(demo_email)
    request.session['user'] = {
        'id': user_id,
        'email': demo_email,
        'name': 'Estudiante Demo'
    }
    return RedirectResponse(url='/')

@router.get('/callback')
async def auth_callback(request: Request):
    """
    GET /callback: Recibe respuesta OAuth, guarda usuario en sesión y redirige (302) a /.
    """
    try:
        if hasattr(oauth, 'auth0'):
            token = await oauth.auth0.authorize_access_token(request)
            userinfo = token.get('userinfo')
            if userinfo:
                email = userinfo.get('email', 'usuario@edulayout.org')
                user_id = ensure_user_in_db(email)
                request.session['user'] = {
                    'id': user_id,
                    'email': email,
                    'name': userinfo.get('name', email),
                    'sub': userinfo.get('sub')
                }
            return RedirectResponse(url='/')
        else:
            return RedirectResponse(url='/')
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": "Fallo en la autenticación", "details": str(e)})

@router.get('/logout')
async def logout(request: Request):
    """
    GET /logout: Borra cookie local y redirige (302) al logout de Auth0 para un cierre real.
    """
    request.session.clear()
    
    if AUTH0_DOMAIN and AUTH0_CLIENT_ID:
        return_to = urllib.parse.quote(str(request.url_for('logged_out')))
        logout_url = f"https://{AUTH0_DOMAIN}/v2/logout?client_id={AUTH0_CLIENT_ID}&returnTo={return_to}"
        return RedirectResponse(url=logout_url)
    
    return RedirectResponse(url='/logged-out')

@router.get('/logged-out')
async def logged_out():
    """
    GET /logged-out: Devuelve 200 confirmando que la sesión se cerró.
    """
    return JSONResponse(status_code=200, content={"message": "Sesión cerrada correctamente."})

@router.get('/api/me')
async def api_me(request: Request):
    """
    GET /api/me: Devuelve el usuario actual en sesión.
    """
    user = request.session.get('user')
    if not user:
        # Fallback para permitir pruebas fluidas si no hay sesión estricta
        return {"user": None, "authenticated": False}
    return {"user": user, "authenticated": True}

@router.post('/api/auth/login')
async def api_login(request: Request):
    """
    POST /api/auth/login: Login directo para frontend interactivo.
    """
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    email = body.get("email", "demo@edulayout.org")
    user_id = ensure_user_in_db(email)
    user_info = {
        'id': user_id,
        'email': email,
        'name': body.get('name', email.split('@')[0])
    }
    request.session['user'] = user_info
    return {"success": True, "user": user_info}
