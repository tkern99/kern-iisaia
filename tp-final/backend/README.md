# EduLayout — Backend (FastAPI + SQLite)

Backend REST del editor educativo de layouts CMOS **EduLayout** (PDK **GPDK045 45nm**). Está diseñado para ser minimalista, fácil de explicar y sin dependencias externas pesadas: utiliza únicamente **FastAPI**, **Uvicorn**, **Pydantic** y el motor **SQLite** integrado en la librería estándar de Python (`sqlite3`).

---

## 🛠️ Stack y Dependencias (`requirements.txt`)

- **FastAPI** (`>=0.115.0`): Framework web para definir los endpoints REST y generar documentación automática OpenAPI/Swagger.
- **Uvicorn** (`>=0.30.0`): Servidor ASGI para ejecutar la aplicación.
- **Pydantic** (`>=2.8.0`): Validación de datos y esquemas de entrada (`LoginRequest`, `LayoutCreate`, `CheckoutRequest`, `LayoutVersionCreate`, etc.).
- **SQLite3** (estándar en Python): Persistencia relacional en un único archivo local (`simulator.db`).

---

## 🚀 Ejecución Rápida

Desde la carpeta `backend/`:

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Iniciar el servidor (puerto 3001 por defecto)
python main.py
```

También se puede iniciar directamente con Uvicorn:

```bash
python -m uvicorn main:app --port 3001 --reload
```

- **URL base**: `http://localhost:3001`
- **Documentación interactiva (Swagger UI)**: `http://localhost:3001/docs`
- **Healthcheck**: `http://localhost:3001/api/health`

---

## 📁 Estructura de Archivos

```text
backend/
├── main.py            # Punto de entrada: inicializa/migra SQLite, siembra celdas estándar y arranca FastAPI
├── handler.py         # Definición de rutas REST, lógica de autenticación, checkout/check-in y validación DRC
├── database.sql       # Esquema DDL de las tablas SQLite y datos semilla (usuarios demo y PDK GPDK045)
├── openapi.yaml       # Especificación OpenAPI 3.0 de referencia del proyecto
├── requirements.txt   # Dependencias mínimas de Python (fastapi, uvicorn, pydantic)
└── simulator.db       # Base de datos SQLite autogenerada al iniciar el servidor
```

---

## 🗄️ Modelo de Datos (`database.sql`)

Al arrancar, `init_db()` en [`main.py`](main.py) ejecuta [`database.sql`](database.sql), aplica migraciones seguras (`PRAGMA table_info`) por si existía una versión previa de `simulator.db`, y siembra las celdas estándar desde el frontend (`nmos_min`, `pmos_min`, `inv_cmos`) si la tabla `layouts` está vacía.

| Tabla | Columnas Principales | Descripción |
| :--- | :--- | :--- |
| **`users`** | `id`, `email` (UNIQUE), `password` | Usuarios registrados. Incluye por defecto la cuenta de prueba `demo@edulayout.org` (contraseña `1234`). |
| **`pdks`** | `id`, `name`, `drc_rules`, `is_custom`, `user_id` | Reglas de diseño (JSON) por capa del proceso (`GPDK045`). |
| **`layouts`** | `id`, `name`, `pdk_id`, `user_id`, `is_checked_out`, `checked_out_by` | Celdas/diseños guardados y su estado de bloqueo exclusivo actual. |
| **`layout_versions`** | `id`, `layout_id`, `version_number`, `comment`, `data` | Historial inmutable de versiones de cada layout (`UNIQUE(layout_id, version_number)`), con comentario descriptivo y geometrías en JSON. |
| **`layout_instances`** | `id`, `parent_layout_id`, `child_layout_id`, `x_pos`, `y_pos` | Relación jerárquica para instanciar un sub-layout dentro de otro (con validación contra dependencias circulares). |

---

## 🔒 Flujo de Autenticación y Concurrencia (Checkout / Check-in)

1. **Login (`POST /api/login`)**:
   - Si el `email` existe en `users`, verifica que `password` coincida (devuelve `401 Unauthorized` si es incorrecta).
   - Si el `email` no existe, registra automáticamente al nuevo usuario con la contraseña ingresada.

2. **Checkout (`POST /api/layouts/{id}/checkout`)**:
   - Marca el layout con `is_checked_out = 1` y `checked_out_by = user_id`.
   - Si otro usuario intenta hacer checkout mientras está bloqueado, el servidor responde **`409 Conflict`** indicando el email del usuario que posee el bloqueo.

3. **Check-in (`POST /api/layouts/{id}/versions`)**:
   - Verifica que el layout no esté bloqueado por otro usuario (si lo está, devuelve **`403 Forbidden`**).
   - Opcionalmente ejecuta una validación DRC básica en el servidor (`validate_drc`) cuando `skip_drc = False`.
   - Calcula atómicamente el siguiente `version_number` (`COALESCE(MAX(version_number), 0) + 1`), guarda el JSON de figuras junto con el `comment` de la versión, y **libera el bloqueo** (`is_checked_out = 0`, `checked_out_by = NULL`).

---

## 🔌 Endpoints de la API (`handler.py`)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del servidor y PDK activo. |
| `GET` | `/api/users` | Lista todos los usuarios registrados (`id`, `email`). |
| `POST` | `/api/login` | Autentica un usuario con `email` y `password` (alias: `/api/auth/login`). |
| `GET` | `/api/layouts` | Lista todos los layouts con `is_checked_out`, `checked_out_by` y `checked_out_by_email`. |
| `POST` | `/api/layouts` | Crea un nuevo layout (o devuelve el existente si el nombre ya está registrado). |
| `DELETE` | `/api/layouts/{id}` | Elimina un layout y todas sus versiones en cascada (`ON DELETE CASCADE`). |
| `POST` | `/api/layouts/{id}/checkout` | Bloquea el layout para edición exclusiva del `user_id` solicitante. |
| `GET` | `/api/layouts/{id}/versions` | Historial de versiones de un layout ordenado de más reciente a más antiguo. |
| `GET` | `/api/layouts/{id}/versions/{vid}` | Obtiene las geometrías y comentario de una versión específica. |
| `POST` | `/api/layouts/{id}/versions` | **Check-in**: guarda una nueva versión con comentario y desbloquea el layout. |
| `POST` | `/api/layouts/{id}/instances` | Registra una instancia de un layout hijo dentro de un layout padre. |

> **Nota sobre compatibilidad**: `handler.py` también expone los aliases `/api/projects`, `/api/projects/{id}` y `/api/projects/{id}/versions` mapeados directamente a las funciones de `/api/layouts` para mantener compatibilidad con todos los componentes del frontend.

---

## 🧹 Mantenimiento de la Base de Datos (`simulator.db`)

- **Reiniciar la base de datos desde cero**: Detener el servidor, eliminar el archivo `backend/simulator.db` y volver a ejecutar `python main.py`. Se regenerará automáticamente con el usuario demo y las celdas estándar.
- **Edición puntual**: Se puede abrir `backend/simulator.db` con **DB Browser for SQLite** o la extensión **SQLite Viewer** de VS Code para inspeccionar o editar filas específicas de `users`, `layouts` o `layout_versions`.
