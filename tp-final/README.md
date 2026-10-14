# Trabajo Práctico Final — EduLayout (Editor Educativo de Layouts CMOS)

Un editor de layouts de circuitos integrados CMOS para el navegador, basado en el PDK real **GPDK045** de Cadence (proceso de 45nm), orientado a la enseñanza universitaria en microelectrónica. Permite dibujar geometrías respetando las capas y reglas del PDK, realizar verificación **DRC (Design Rule Check)** en tiempo real, extracción de netlist y validación **LVS (Layout Versus Schematic)** frente a celdas lógicas básicas (Inversor, NAND, NOR, AND, OR), y gestionar el trabajo colaborativo mediante control de versiones con bloqueo exclusivo (**Checkout / Check-in**) y comentarios por versión.

El frontend está desarrollado con **React**, **Vite**, **Konva.js** (canvas 2D de alto rendimiento) y **Zustand**. El backend es una API REST en **Python** con **FastAPI** y persistencia en **SQLite**.

---

## Cómo se ejecuta

Hace falta **Python 3.10 o superior** y **Node.js 18 o superior**. La base de datos SQLite (`simulator.db`) se inicializa, migra y siembra automáticamente en el primer arranque del backend sin necesidad de configuración previa.

### 1. Iniciar el Backend (FastAPI + SQLite)

Abrir una terminal en la carpeta `backend`, instalar las dependencias e iniciar el servidor:

```bash
cd backend
pip install -r requirements.txt
python main.py
```

- El servidor quedará escuchando en `http://localhost:3001`.
- Al arrancar, [`main.py`](backend/main.py) ejecuta [`database.sql`](backend/database.sql), crea o actualiza `simulator.db`, inserta la cuenta de prueba `demo@edulayout.org` (contraseña `1234`) y precarga las celdas estándar del PDK GPDK045 (`nmos_min`, `pmos_min`, `inv_cmos`).
- La documentación interactiva OpenAPI (Swagger UI) está disponible en `http://localhost:3001/docs`.

Si el puerto 3001 estuviera ocupado, se puede especificar otro puerto con Uvicorn:

```bash
python -m uvicorn main:app --port 3005 --reload
```

### 2. Iniciar el Frontend (React + Vite)

Abrir una segunda terminal en la carpeta `frontend`, instalar los paquetes de Node y levantar el entorno de desarrollo:

```bash
cd frontend
npm install
npm run dev
```

- Abrir en el navegador la dirección local que indique la consola (generalmente `http://localhost:5173`).

### 3. Uso en el navegador

1. **Inicio de sesión**: Al ingresar, el modal solicita credenciales. Se puede hacer clic en el chip de acceso rápido de la cuenta `demo@edulayout.org` (contraseña: `1234`) o ingresar cualquier email y contraseña (si el usuario no existe, el sistema lo registra de forma automática).
2. **Edición en Canvas**: Seleccionar herramientas de dibujo (`Rectángulo`, `Vía/Contacto`) y capas del LSW (`Poly`, `Oxide`, `Metal1`, etc.) para dibujar transistores y ruteos sobre la grilla con snap automático.
3. **Verificación DRC y LVS**:
   - Presionar **DRC** en el encabezado para validar anchos mínimos, espaciados y recubrimientos del proceso GPDK045.
   - Presionar **LVS** para extraer la netlist topológica del diseño y contrastarla contra cualquiera de las 5 celdas esquemáticas de referencia.
4. **Checkout y Check-in**:
   - Para modificar un diseño existente, presionar **Checkout**. Esto bloquea el layout a nombre del usuario activo.
   - Si otro usuario inicia sesión en otra ventana o pestaña e intenta abrir ese layout, lo verá en **Modo Solo Lectura** y no podrá sobreescribirlo.
   - Al presionar **Guardar / Check-in**, se solicita un comentario descriptivo, se almacena la nueva versión numerada en SQLite y se libera el bloqueo para el resto del equipo.

---

## Arquitectura

El sistema se compone de dos capas desacopladas comunicadas vía HTTP/JSON:

```text
tp-final/
├── backend/
│   ├── main.py            Punto de entrada FastAPI, migraciones automáticas y seed de celdas
│   ├── handler.py         Endpoints REST, autenticación, lógica de checkout/check-in y validación DRC
│   ├── database.sql       Esquema relacional SQLite (users, pdks, layouts, versions, instances)
│   ├── openapi.yaml       Especificación formal del contrato OpenAPI 3.1
│   ├── requirements.txt   Dependencias mínimas (fastapi, uvicorn, pydantic)
│   └── simulator.db       Base de datos SQLite local (autogenerada)
├── frontend/
│   ├── index.html         Contenedor principal de la SPA
│   ├── vite.config.js     Configuración de Vite
│   ├── src/
│   │   ├── main.jsx       Punto de entrada React
│   │   ├── App.jsx        Layout general y orquestación de modales
│   │   ├── components/
│   │   │   ├── auth/      LoginModal (ingreso con contraseña y usuarios rápidos)
│   │   │   ├── editor/    LayoutCanvas (Stage Konva, grilla, renders por capa, rulers)
│   │   │   ├── lsw/       LayerPanel y LayerRow (paleta Virtuoso de capas, visibilidad y bloqueo)
│   │   │   ├── toolbar/   Herramientas de dibujo (Select, Rect, Via/Cont)
│   │   │   ├── header/    Header y VersionsModal (guardado, checkout, historial con comentarios)
│   │   │   ├── drc/       DrcModal (reporte visual de violaciones)
│   │   │   ├── lvs/       LvsModal (comparador topológico contra esquemáticos)
│   │   │   └── library/   LibraryPanel (instanciación de celdas del PDK)
│   │   ├── store/         Zustand: useAuthStore, useLayoutStore, useToolStore
│   │   ├── utils/         drcEngine.js, netlistExtractor.js, lvsEngine.js
│   │   └── data/          gpdk045_layers.js, gpdk045_drc_rules.js, schematicNetlists.js
│   └── package.json
├── assuraDRC.rul          Reglas DRC originales del PDK GPDK045
├── extract.rul            Reglas de extracción LVS originales
├── gpdk045.layermap       Mapeo de capas y GDS numbers
└── tech_gpdk045.tf        Archivo de tecnología de Cadence
```

### Endpoints de la API (`backend/handler.py`)

| Método | Ruta | Respuestas | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | `200` | Estado del backend y versión de PDK activa |
| `GET` | `/api/users` | `200` | Lista de usuarios registrados |
| `POST` | `/api/login` | `200` · `400` · `401` | Autenticación con contraseña (o autoregistro de usuario) |
| `GET` | `/api/layouts` | `200` | Catálogo de layouts con información de checkout y autor del bloqueo |
| `POST` | `/api/layouts` | `201` · `400` | Creación de un layout en la base |
| `DELETE` | `/api/layouts/{id}` | `200` · `404` | Eliminación en cascada de un layout y sus versiones |
| `POST` | `/api/layouts/{id}/checkout` | `200` · `404` · `409` | Bloqueo exclusivo para edición (`409` si otro usuario lo tiene) |
| `GET` | `/api/layouts/{id}/versions` | `200` · `404` | Historial de versiones del layout (con comentarios) |
| `GET` | `/api/layouts/{id}/versions/{vid}` | `200` · `404` | Geometría y metadatos de una versión puntual |
| `POST` | `/api/layouts/{id}/versions` | `201` · `400` · `403` · `404` · `409` | **Check-in**: guarda nueva versión con comentario y libera el bloqueo |
| `POST` | `/api/layouts/{id}/instances` | `201` · `400` · `404` | Instanciación jerárquica de sub-layouts |

> Para máxima compatibilidad con los distintos módulos de la aplicación, el backend expone aliases `/api/projects/*` mapeados 1 a 1 sobre `/api/layouts/*`.

### Datos

El modelo relacional en SQLite consta de 5 tablas con restricciones explícitas de integridad referencial (`PRAGMA foreign_keys = ON`):
- `users`: `id`, `email` (único) y `password`.
- `pdks`: `id`, `name`, `drc_rules` (JSON), `is_custom`, `user_id`.
- `layouts`: `id`, `name`, `pdk_id`, `user_id`, `is_checked_out` (booleano), `checked_out_by` (FK a `users`).
- `layout_versions`: `id`, `layout_id`, `version_number`, `comment`, `data` (JSON con geometrías). Restricción `UNIQUE (layout_id, version_number)`.
- `layout_instances`: `id`, `parent_layout_id`, `child_layout_id`, `x_pos`, `y_pos`.

### Contrato entre la interfaz y el servidor

Ejemplo de Checkout exclusivo:
```http
POST /api/layouts/1/checkout
Content-Type: application/json

{ "user_id": 1 }

HTTP/1.1 200 OK
{
  "message": "Layout bloqueado para edición (checked out)",
  "id": 1,
  "is_checked_out": true,
  "checked_out_by": 1,
  "checked_out_by_email": "demo@edulayout.org"
}
```

Si otro usuario intenta modificar o hacer checkout sobre este diseño:
```http
HTTP/1.1 409 Conflict
{ "detail": "Conflicto - El layout ya está bloqueado (checked out) por demo@edulayout.org" }
```

Ejemplo de Check-in con comentario descriptivo:
```http
POST /api/layouts/1/versions
Content-Type: application/json

{
  "user_id": 1,
  "comment": "Ruteo de salida en Metal1 y contactos a VDD",
  "data": [
    { "id": "poly_gate", "layerId": "Poly", "x": 0.1, "y": 0.0, "width": 0.045, "height": 0.3 }
  ],
  "skip_drc": false
}

HTTP/1.1 201 Created
{
  "id": 8,
  "version_number": 2,
  "comment": "Ruteo de salida en Metal1 y contactos a VDD",
  "layout_id": 1,
  "is_checked_out": false,
  "checked_out_by": null
}
```

---

## Qué decidimos

**Interfaz y experiencia de usuario inspiradas en Cadence Virtuoso.** En microelectrónica, es fundamental que los estudiantes se familiaricen con los paradigmas y estándares de la industria. Por ello, diseñamos la interfaz recreando los aspectos centrales de Virtuoso: fondo negro en el canvas, grilla de manufactura con snap paramétrico a `0.005 µm`, panel **LSW (Layer Selection Window)** lateral con control de visibilidad (`eye`) y bloqueo (`lock`), paleta fiel con las 9 capas del proceso GPDK045 (`Nwell`, `Oxide`, `Poly`, `Nimp`, `Pimp`, `Cont`, `Metal1`, `Via1`, `Metal2`) junto a sus respectivos patrones visuales de stipple (rayado diagonal, cruzado, punteado y sólido), y atajos de teclado estándar (`R` para rectángulos, `S` para selección, `V` para contactos/vías, `Space + Drag` para paneo y rueda del mouse para zoom centrado en el cursor).

**Konva.js (React-Konva) para el canvas en lugar de SVG.** Un editor de microelectrónica debe manejar decenas o cientos de geometrías solapadas con tramas de relleno semitransparentes. Usar elementos SVG tradicionales en el DOM genera una sobrecarga computacional importante de repaint y reflow al realizar zoom o paneo continuo. Optamos por Konva porque proporciona un Scene Graph estructurado en capas sobre Canvas HTML5 acelerado por hardware, manteniendo una tasa constante de 60 FPS sin degradar el rendimiento del navegador.

**División de responsabilidades y trabajo en equipo.** Nos repartimos el desarrollo del proyecto de forma clara y coordinada: uno de nosotros asumió el frontend (React, Konva, UI estilo Virtuoso, motores en cliente) y el otro el backend (FastAPI, SQLite, concurrencia y validaciones de servidor). Para avanzar en paralelo sin bloquearnos, el primer paso en común fue acordar y congelar el contrato de datos mediante un esquema relacional SQLite estricto y la especificación en `openapi.yaml`.

**Autenticación local con contraseñas en lugar de OAuth/Auth0.** En la propuesta inicial se exploró integrar Auth0 con cookies firmadas (`authlib`). Sin embargo, evaluamos que para un trabajo práctico orientado a microelectrónica, exigir conexión permanente a internet, configuración de tenants remotos y callbacks OAuth en localhost agregaba una capa de fragilidad innecesaria. Decidimos implementar la autenticación directamente en el backend mediante SQLite y contraseñas (`POST /api/login`), incluyendo cuentas demo precargadas y autoregistro automático. Esto garantiza que la aplicación sea 100% autónoma y pueda ejecutarse y defenderse sin inconvenientes en cualquier máquina o laboratorio sin conexión externa.

**Control de versiones colaborativo con Checkout exclusivo (bloqueo).** En herramientas EDA profesionales (como SOS de ClioSoft o DesignSync), dos diseñadores no pueden modificar la misma celda en simultáneo sin generar conflictos geométricos irreparables. Para reflejar esta realidad, implementamos un esquema de concurrencia pesimista: cuando un usuario hace *Checkout*, el layout se bloquea a su nombre (`checked_out_by`). Si otro integrante del equipo abre el diseño, el frontend pasa automáticamente a modo *Solo Lectura* (con banner informativo) y el backend rechaza cualquier intento de guardado con `403 Forbidden` hasta que el autor original realice el *Check-in*.

**Historial inmutable con comentarios obligatorios y auto-numeración atómica.** Cada *Check-in* produce una nueva entrada en `layout_versions` que almacena la instantánea JSON del diseño junto con un comentario técnico que documenta el cambio. La numeración de versiones se calcula atómicamente en el motor de base de datos (`COALESCE(MAX(version_number), 0) + 1`), protegida por una restricción de unicidad `UNIQUE (layout_id, version_number)` que previene condiciones de carrera atrapando el `IntegrityError` y retornando `409 Conflict`.

**Motor LVS ampliado a 5 celdas CMOS con resolución de simetría.** En lugar de quedarnos únicamente con la celda del inversor, decidimos ampliar la biblioteca de referencia a 5 compuertas CMOS fundamentales: `inv_cmos` (NOT), `nand_cmos` (NAND2), `nor_cmos` (NOR2), `and_cmos` (AND2) y `or_cmos` (OR2). El extractor de netlist identifica transistores NMOS y PMOS por superposición de capas y recorre los nodos eléctricos mediante búsqueda en anchura (BFS). Para evitar falsos negativos en la comparación, el motor LVS incorpora resolución de conmutabilidad lógica en entradas simétricas (`A` y `B`) y mapeo topológico de nodos serie intermedios (como el nodo flotante entre los NMOS en serie de una compuerta NAND).

**FastAPI y Pydantic en lugar de Node/Express para el backend.** Si bien existían plantillas iniciales basadas en Node.js, acordamos construir el backend en Python con FastAPI por ser el estándar predominante en ingeniería de software moderna: ofrece tipado estricto con Pydantic, generación nativa de documentación OpenAPI/Swagger en `/docs` y acceso directo a la biblioteca estándar `sqlite3` sin sobrecargas de ORMs adicionales.

---

## Cómo gestionamos el contexto

**Planificación estructurada inicial (`plan_layout_editor.md`).** Antes de escribir las primeras líneas de código, elaboramos un plan integral que fijó el stack tecnológico, definió las 9 capas del PDK GPDK045 a partir de `gpdk045.layermap` y `tech_gpdk045.tf` (documentando particularidades del proceso, como que la capa activa se denomina internamente `Oxide`), recopiló las reglas de diseño del archivo real `assuraDRC.rul`, y organizó la jerarquía de componentes visuales. Este documento constituyó la referencia central para todo el desarrollo asistido.

**Prompts guiados por contratos y descomposición en etapas.** El backend y sus interfaces se construyeron mediante prompts secuenciales y focalizados:
1. *Modelado formal de la base de datos*: Un prompt inicial dedicado exclusivamente al esquema DDL de SQLite, especificando tipos de datos concretos (`INTEGER PRIMARY KEY AUTOINCREMENT`, campos `TEXT` para datos estructurados en JSON) y restricciones de integridad referencial con borrado en cascada.
2. *Contrato formal OpenAPI 3.1*: Un prompt orientado a redactar `openapi.yaml`, detallando los 5 elementos esenciales de cada endpoint (método HTTP, path, schema de entrada, schema de salida y códigos de respuesta: 200, 201, 400, 401, 403, 404, 409).
3. *Handler de check-in y concurrencia*: Un prompt centrado en la lógica de guardado de versiones, validación DRC previa en el servidor, cálculo atómico de versión y manejo robusto de colisiones de concurrencia.

**Desacoplamiento efectivo entre frontend y backend.** Contar con el esquema de base de datos y la especificación OpenAPI definidos desde el comienzo permitió que ambos trabajáramos en simultáneo sin dependencias bloqueantes: el frontend pudo avanzar simulando respuestas o consumiendo datos estructurados mientras el backend completaba la lógica de negocio y persistencia.

**Modularidad y diseño de componentes compactos.** Procuramos mantener una arquitectura de código clara y desacoplada: los algoritmos matemáticos y geométricos (`drcEngine.js`, `netlistExtractor.js`, `lvsEngine.js`) se ubicaron en módulos aislados en `utils/`, el estado de la aplicación se fragmentó en stores específicos de Zustand (`useAuthStore`, `useLayoutStore`, `useToolStore`), y los endpoints se agruparon en `handler.py` con esquemas Pydantic, dejando `main.py` reservado para inicialización, migraciones y arranque del servidor.

**Verificación continua y validación cruzada.** Cada iteración (incorporación de contraseñas, lógica de checkout, comentarios en versiones y nuevas celdas esquemáticas) fue verificada de inmediato ejecutando pruebas automatizadas con el `TestClient` de FastAPI y compilando el bundle del frontend con `npm run build` para asegurar la ausencia de regresiones.

---

## Qué salió mal

**La primera integración entre frontend y backend resultó compleja.** En las primeras etapas, el frontend se había estructurado asumiendo endpoints bajo la convención `/api/projects/:id/versions` enviando un payload con `{ label, snapshot }`. En paralelo, el backend en FastAPI se había implementado siguiendo la terminología EDA con `/api/layouts/{id}/versions` y campos `{ data, skip_drc }`. Al conectar ambas partes por primera vez, el guardado fallaba con errores 404 y 422 debido a nombres de rutas y estructuras JSON desalineadas. En lugar de forzar reescrituras masivas en el cliente, implementamos en `handler.py` una serie de endpoints puente (aliases `/api/projects/*`) y una capa de normalización en Pydantic capaz de interpretar indistintamente arrays directos de geometrías, objetos `{ shapes: [...] }` o strings JSON serializados, resolviendo la discrepancia de manera limpia y transparente.

**La interfaz del modal LVS desbordaba la pantalla al sumar más celdas.** La versión inicial del modal LVS fue concebida para una sola celda de prueba (el inversor). Sin embargo, al incorporar las cuatro celdas lógicas complejas adicionales (NAND, NOR, AND, OR), la lista vertical de celdas disponibles pasó a ocupar gran parte del espacio visible. En pantallas de computadoras portátiles habituales en el entorno universitario (resolución 1366×768 o 1080p con escalado del sistema operativo), el botón para ejecutar LVS y la tabla comparativa de transistores y pines quedaban desplazados fuera del viewport, exigiendo scroll excesivo o quedando parcialmente tapados. Para solucionarlo, rediseñamos el componente `LvsModal`: la selección de celdas se transformó en una grilla compacta de dos columnas con scroll interno independiente (`max-height: 140px`) y se unificó la barra de acciones superior, garantizando una visualización clara del reporte en cualquier pantalla.

**Falsos errores de LVS por conmutabilidad de entradas y nombres de nodos internos.** En el inversor CMOS, la correspondencia de terminales es directa (un pin `IN` y un pin `OUT`). Pero en compuertas de dos entradas como NAND2 o NOR2, las entradas `A` y `B` son funcionalmente intercambiables (simetría lógica). Inicialmente, el motor realizaba una comparación posicional estricta: si en el layout se conectaba la entrada `A` en el transistor inferior y la `B` en el superior, el LVS reportaba una falla topológica al no coincidir el orden de terminales. Asimismo, los nodos serie intermedios entre transistores conectados en cascada se extraían en el layout con nombres temporales generados al vuelo (ej. `net_3`), mientras que en el esquemático figuraban con etiquetas simbólicas (como `_mid_nmos`). Tuvimos que refactorizar `lvsEngine.js` para incorporar resolución de simetrías mediante permutación de entradas y emparejamiento topológico por conectividad de terminales en lugar de comparación literal de cadenas.

**Procesos huérfanos en Windows y discrepancia entre copias locales.** Durante una jornada de pruebas en Windows, detectamos que las modificaciones realizadas en la base de datos no se reflejaban en el navegador al recargar. Al diagnosticar la situación, descubrimos dos factores combinados: por un lado, al detener el servidor de desarrollo, un worker huérfano de Python continuaba corriendo en segundo plano reteniendo el puerto 3001; por otro lado, existían dos copias del repositorio en el equipo (`kern-iisaia-main\tp-final` y `IISAIA\tp-final`), y el proceso activo estaba vinculado a la base de datos de la otra carpeta. Diagnosticamos el problema utilizando `Get-NetTCPConnection` y scripts de inspección, terminamos los procesos huérfanos y unificamos los archivos y bases de datos en ambas carpetas.

**El descarte de Auth0 en favor de la portabilidad.** El intento inicial de integrar Auth0 con `authlib` demandaba configurar dominios externos, gestionar secretos y lidiar con redirecciones HTTP que fallaban si el entorno de ejecución no contaba con acceso a internet o se levantaba en direcciones IP locales distintas a `127.0.0.1`. Reconocer oportunamente que esta dependencia externa introducía una complejidad innecesaria para los objetivos del trabajo práctico y reemplazarla por un sistema de usuarios local en SQLite fue una decisión clave para garantizar la estabilidad y reproducibilidad del proyecto.
