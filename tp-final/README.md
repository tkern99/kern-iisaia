# Agenda Telefónica "Tiro al Blanco"

Aplicación web retro para agendar contactos. El número se arma cazando dígitos en movimiento (tiro al blanco) y se guarda en SQLite.

Hay cuentas locales (usuario + contraseña) y un modo invitado: los contactos del invitado se pierden al cerrar o recargar la página.

## Requisitos

- Python 3.10 o superior
- pip

## Cómo correrlo

En la carpeta del proyecto:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

En Linux o macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Abrí [http://127.0.0.1:8000](http://127.0.0.1:8000) en el navegador.

La API queda documentada en [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Uso

1. Creá una cuenta o entrá con una existente, o continuá como invitado.
2. En **Digitar y Agendar**, disparale a los números para armar el teléfono, poné un nombre y agenda el contacto.
3. Arrastrá un dígito al tacho para borrarlo.
4. En **Agenda de Contactos** ves y eliminás los de tu cuenta (o los temporales si sos invitado).
5. **Salir** cierra la sesión.

Los usuarios y contactos de cuentas quedan en `contacts.db` (se crea al primer arranque). Ese archivo no se versiona.

## Estructura

- `main.py` — FastAPI, SQLite, login y agenda
- `index.html` — UI y minijuego
- `requirements.txt` — `fastapi` y `uvicorn`
- `CONTEXT.md` — detalle del modelo y endpoints
