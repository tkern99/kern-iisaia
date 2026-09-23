# Contexto del Proyecto: Agenda Telefónica "Tiro al Blanco"

## 1. Visión General
Aplicación web retro ("Bad UI") para agendar contactos. El usuario debe ingresar el número telefónico "cazando" dígitos en movimiento a través de un minijuego de tiro al blanco antes de guardarlo en una base de datos. Hay cuentas locales (usuario + contraseña) y un modo invitado cuyos contactos se pierden al cerrar la página.

## 2. Arquitectura y Stack
* **Frontend:** Vanilla HTML, CSS y JavaScript (sin frameworks ni dependencias externas, estética retro años 90: beige, bordes duros, tipografía monoespaciada).
* **Backend:** FastAPI (Python) sirviendo una API REST plana.
* **Base de Datos:** SQLite local en archivo (`contacts.db`).
* **Servidor local:** Uvicorn.

## 3. Modelo de Datos y Endpoints
* **Tabla `users`:**
  * `id` (Integer, PK, autoincremental)
  * `username` (String, único, requerido; sin reglas extra salvo no vacío ni repetido)
  * `password_hash` / `password_salt` (hash PBKDF2, no se guarda la contraseña en claro)
  * `created_at` (Datetime, generado por servidor)
* **Tabla `sessions`:**
  * `token` (String, PK)
  * `user_id` (FK a users)
  * `created_at`
* **Tabla `contacts`:**
  * `id` (Integer, primary key, autoincremental)
  * `user_id` (Integer, dueño de la agenda)
  * `name` (String, requerido)
  * `phone_number` (String, requerido)
  * `created_at` (Datetime, generado por servidor)

* **Auth (cookie httponly `session_token`):**
  * `POST /register` → crea usuario, 201, setea cookie. 409 si el usuario ya existe.
  * `POST /login` → 200 + cookie. 401 si no coincide.
  * `POST /logout` → borra sesión y cookie.
  * `GET /me` → `{id, username}` o 401.

* **Contactos (requieren sesión; no aplican al guest):**
  * `GET /contacts` → lista solo los contactos del usuario logueado.
  * `POST /contacts` → crea un contacto (`name`, `phone_number`) asociado a la cuenta. Retorna 201.
  * `DELETE /contacts/{id}` → elimina un contacto propio. Retorna 204.

## 4. Estructura y Flujo de la UI (Frontend)
Pantalla de acceso primero (crear cuenta, entrar, o continuar como invitado). El invitado ve un aviso de que lo agendado se pierde al cerrar o recargar.

Luego, pantalla/menú principal con 2 vistas alternables:

1. **Vista 1: Digitar y Agendar (Campo de Tiro):**
   * **Mecánica del Digitador:**
     * Cursor tipo mira (`crosshair`).
     * Números simultáneos rebotando como bloques físicos rígidos (con colisiones elásticas entre sí y bordes), cantidad y velocidad según el tamaño de ventana.
     * Tiempo de vida: 4 segundos por número antes de desaparecer y respawnear sin solaparse.
     * Generación con sistema "Tetris Bag" (mezcla dígitos 0 al 9 para evitar repeticiones sesgadas).
     * Pantalla de visualización con prefijo `+` y recuadro rojo retro.
     * Mecánica de borrado Drag & Drop arrastrando dígitos individuales a un tacho de basura con instrucciones en el footer.
   * **Formulario de guardado:**
     * Campo para ingresar el nombre del contacto.
     * Botón "Agendar contacto": cuenta logueada dispara `POST /contacts`; invitado guarda solo en memoria.

2. **Vista 2: Agenda de Contactos:**
   * Tabla retro: cuenta logueada vía `GET /contacts`; invitado lee el array local.
   * Eliminar por fila: `DELETE /contacts/{id}` o baja en memoria si es guest.

El header muestra el usuario o `INVITADO: se pierde al cerrar`, y **Salir** vuelve al login.

## 5. Reglas de Desarrollo
* Mantener el código modular, simple y sin sobreingeniería.
* El frontend debe poder servirse desde FastAPI (vía `StaticFiles` o `FileResponse` en la ruta `/`) para evitar problemas de CORS y levantar todo con un solo comando.
