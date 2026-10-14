# EduLayout — Frontend (React + Vite + Konva)

Interfaz gráfica interactiva de **EduLayout**, construida con **React 19**, **Vite**, **React-Konva** (renderizado de geometrías en canvas 2D) y **Zustand** (gestión de estado global).

---

## 🛠️ Scripts Disponibles

Dentro de la carpeta `frontend`:

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (http://localhost:5173)
npm run dev

# Compilar versión de producción en dist/
npm run build

# Ejecutar linter (Oxlint)
npm run lint
```

> **Nota:** Para disponer de persistencia, autenticación, control de versiones y bloqueo por *Checkout / Check-in*, el servidor backend en FastAPI debe estar corriendo en `http://localhost:3001`.

---

## 📂 Organización del Código (`src/`)

### 1. Componentes (`src/components/`)
* **`auth/LoginModal.jsx`**: Pantalla de inicio de sesión con contraseña, selector rápido de cuenta demo (`demo@edulayout.org`) y registro automático de nuevas cuentas.
* **`header/Header.jsx`**: Barra superior con indicador del proyecto activo, estado del bloqueo (*Disponible*, *En edición por ti* o *Bloqueado por otro usuario*), accesos a DRC, LVS, Versiones y cambio de cuenta.
* **`header/VersionsModal.jsx`**: Panel de control de versiones conectado a FastAPI/SQLite. Permite crear layouts, hacer **Checkout** (bloqueo exclusivo), hacer **Check-in** con validación DRC y comentarios descriptivos, y restaurar versiones anteriores en el canvas.
* **`editor/LayoutCanvas.jsx`**: Lienzo interactivo basado en `react-konva` con zoom, paneo, grilla ajustable, dibujo de rectángulos, ruteo ortogonal (`path`), colocación automática de contactos/vías (`via`), sondas de nodos eléctricos (`probe`), regla de medición (`ruler`), marcadores DRC y banner de **Modo Solo Lectura** cuando otro usuario tiene el archivo en checkout.
* **`lsw/LayerPanel.jsx`**: Selector de capas del PDK GPDK045 (`Nwell`, `Oxide`, `Poly`, `Nimp`, `Pimp`, `Cont`, `Metal1`, `Via1`, `Metal2`, `PinM1`, `PinM2`) con control de visibilidad y bloqueo por capa.
* **`library/LibraryPanel.jsx`**: Librería de celdas estándar del PDK y proyectos personalizados guardados, permitiendo instanciarlos o cargarlos para edición.
* **`drc/DrcModal.jsx`**: Modal de ejecución y reporte de reglas de diseño (DRC).
* **`lvs/LvsModal.jsx`**: Modal compacto y responsivo para comparar la netlist extraída del canvas contra las referencias esquemáticas.

### 2. Estado Global (`src/store/`)
* **`useAuthStore.js`**: Gestiona la sesión del usuario autenticado (`user`, `token`, `login`, `logout`) persistida en `localStorage`.
* **`useLayoutStore.js`**: Almacena las geometrías del canvas (`shapes`), historial de *Undo*, selección, estado de capas, violaciones DRC y estado de bloqueo del layout activo (`currentLayoutId`, `currentLayoutLock`).
* **`useToolStore.js`**: Controla la herramienta activa (`select`, `move`, `draw`, `path`, `via`, `pin`, `probe`, `ruler`, `instance`) y el paso de grilla (`snapGrid`).

### 3. Datos del PDK y Esquemáticos (`src/data/`)
* **`gpdk045_layers.js`**: Definición de capas, colores y patrones de relleno (*stipples*) del proceso de 45nm.
* **`drcRules.js` / `gpdk045_drc_rules.js`**: Reglas geométricas de ancho mínimo, espaciamiento, solapamiento y extensión.
* **`standardCells.js`**: Geometrías base verificadas (`nmos_min`, `pmos_min`, `inv_cmos`).
* **`schematicNetlists.js`**: Referencias esquemáticas para LVS:
  * Inversor (`inv_cmos`)
  * Compuerta NAND de 2 entradas (`nand_cmos`)
  * Compuerta NOR de 2 entradas (`nor_cmos`)
  * Compuerta AND de 2 entradas (`and_cmos`)
  * Compuerta OR de 2 entradas (`or_cmos`)

### 4. Motores de Verificación (`src/utils/`)
* **`drcEngine.js`**: Motor geométrico de verificación de reglas de diseño en el cliente.
* **`netlistExtractor.js`**: Algoritmo BFS geométrico que divide el difusión (`Oxide`) por `Poly`, agrupa formas conectadas en nodos eléctricos (`nets`), identifica transistores NMOS/PMOS y extrae pines nombrados.
* **`lvsEngine.js`**: Comparador topológico entre la netlist extraída y el esquemático de referencia, con soporte para permutación de terminales D/S, seguimiento de nodos internos en serie/etapas y simetría de entradas lógicas (`A`/`B`).
