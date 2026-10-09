# EduLayout - CMOS Layout Editor

EduLayout es un editor de layouts CMOS orientado a la enseñanza. Cuenta con separación entre Frontend (React) y Backend (Node.js + SQLite), e incluye validación LVS (Layout Versus Schematic) básica y herramientas de trazado de redes eléctricas.

## 🚀 Cómo empezar en una nueva PC

El proyecto está configurado para arrancar fácilmente en cualquier computadora sin pasos complicados de configuración. La base de datos se autogenerará si no existe.

### 1. Clonar el repositorio

```bash
git clone https://github.com/tkern99/kern-iisaia.git
cd kern-iisaia/tp-final
```

### 2. Iniciar el Backend (Base de Datos + API)

Abre una terminal en la carpeta `tp-final` y ejecuta:

```bash
cd backend
npm install
node server.js
```
*(Al correr `server.js`, el sistema automáticamente creará la carpeta `db`, generará el archivo `edulayout.db` con sus tablas, insertará el usuario de prueba y precargará los diseños estándar).*

### 3. Iniciar el Frontend (Interfaz Visual React)

Abre una **nueva terminal** en la carpeta `tp-final` y ejecuta:

```bash
cd frontend
npm install
npm run dev
```

Al terminar, la consola te mostrará el link local (generalmente `http://localhost:5173`). ¡Abre ese enlace en tu navegador y ya tienes el editor corriendo!

---
**Nota sobre instancias y proyectos por defecto:**
Al levantar la base de datos por primera vez de cero, los diseños base (`nmos_min`, `pmos_min`, `inv_cmos`) estarán disponibles tanto en el panel de **Library / Instances** para instanciarlos en tus diseños, como precargados como proyectos editables.
