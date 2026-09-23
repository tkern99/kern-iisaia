# FastAPI contacts agenda setup
_Exported on 9/23/2026 at 00:51:21 GMT-3 from Cursor (3.21.18)_

---

**User**

@CONTEXT.md @index.html Revisá el contexto y el digitador actual. Armá el backend en main.py usando FastAPI y SQLite para la agenda de contactos, modificá el index.html para conectar el menú y los endpoints, y decime cómo correrlo.

---

**Cursor**

Voy a leer el contexto y el digitador actual para armar el backend y conectar el menú.

El digitador está en `digitador_tiro_al_blanco.html`; voy a crear `main.py` y `index.html` con menú, formulario y agenda conectados a la API.

Revisé el contexto y el digitador original (`digitador_tiro_al_blanco.html`). Armé el backend y conecté el menú en `index.html`.

**Backend (`main.py`)**  
FastAPI + SQLite (`contacts.db`) con:
- `GET /contacts` — lista
- `POST /contacts` — crea (`name`, `phone_number`) y responde 201
- `DELETE /contacts/{id}` — borra y responde 204
- `GET /` — sirve `index.html` (mismo origen, sin CORS)

**Frontend (`index.html`)**  
Menú con dos vistas:
1. **Digitar y Agendar** — el tiro al blanco, nombre y `POST /contacts`
2. **Agenda de Contactos** — tabla con `GET /contacts` y eliminar por fila

**Cómo correrlo** (desde `tp-final`):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Abrí [http://127.0.0.1:8000](http://127.0.0.1:8000). La API queda en `/docs`.

---

**User**

podes modificar la seccion de tiro al blanco de manera que:
- que se ajuste la velocidad de los numero segun el tamaño de la ventana para que cuando sea mas pequeña no vayan muy rapido.
- ajustar la cantidad de numeros tambien acorde al tamaño de la ventana para que haya un 40% de la pantalla ocupada con numeros

---

**Cursor**

Voy a leer la lógica del campo de tiro y ajustar velocidad y cantidad de números según el tamaño de la ventana.

Voy a escalar la velocidad al tamaño del campo y calcular cuántos números hacen falta para ocupar cerca del 40% del área.

El campo de tiro ahora se adapta al tamaño de la ventana.

**Velocidad:** escala con el lado más chico del campo (referencia 700px). En una ventana chica los números cruzan más lento; si agrandás, se aceleran en proporción.

**Cantidad:** se calcula para ocupar cerca del **40%** del área (`cantidad ≈ 0.4 × ancho × alto / 62²`). Al achicar o agrandar, se sacan o se agregan números para mantener esa densidad.

Recargá [http://127.0.0.1:8000](http://127.0.0.1:8000) y probá redimensionar la ventana: deberías ver menos blancos y más lentos en pantallas chicas, y más blancos cuando hay más espacio.

---

**User**

el problema es que se empiezan a acumular y se llena toda la pantalla de numeros, podes fijarte de reducir el spawn para que no se sature la cantidad de numeros? 

---

**Cursor**

Voy a plantear hipótesis sobre por qué se acumulan los números e instrumentar el spawn para verlo en runtime.

Hipótesis de por qué se llena la pantalla:

- **A:** El intervalo inicial (`startSpawning`) sigue creando números al mismo tiempo que `maintainTargetCount` los reemplaza al morir, y el total crece sin techo.
- **B:** El tope del 40% del área da un `maxActiveNumbers` muy alto (decenas/cientos) y visualmente satura.
- **C:** `syncFieldToViewport` (resize o volver a la vista) mete un lote extra encima del spawn ya en curso.
- **D:** `destroy` saca el objeto del array pero deja nodos en el DOM, así que se ven más números de los que hay en memoria.
- **E:** El intervalo nunca se apaga porque el count queda siempre debajo del cap, y el `spawnDelay` (vida / cantidad) es tan corto que bombea sin parar.

Dejé logs en esos puntos. Recargá la página y dejá que se llene un rato.

<reproduction_steps>
1. Recargá http://127.0.0.1:8000 con hard refresh para tomar el `index.html` nuevo (si uvicorn no está corriendo, levantalo con `uvicorn main:app --reload`).
2. Quedate en “Digitar y Agendar” 10–15 segundos hasta que se note la acumulación o la pantalla saturada.
3. Si podés, achicá o agrandá un poco la ventana una vez.
4. Press Proceed/Mark as fixed when done.
</reproduction_steps>

---

**User**

Issue reproduced, please proceed.

---

**Cursor**

Los logs confirman el tope: en 2520×1150 el cap es **302** números (`occupancyCount: 302`) y el spawn va a **13 ms**. No hay leak de DOM. Bajo la occupancy y pongo un tope realista, dejando los logs para verificar.

**Qué mostraron los logs**

- **B confirmada:** el 40% del área daba `maxActiveNumbers = 302` en 2520×1150, con `spawnDelay` de 13 ms. En ventana más chica igual llegaba a 76.
- **A rechazada como leak:** el intervalo se frenó en 302 y `arrayLen` no pasó el cap; el “llenado” es el tope, no un spawn doble descontrolado.
- **C rechazada:** el resize ajustó 70→76, igual al cap.
- **D rechazada:** `arrayLen` y `domCount` siempre coinciden.

**Cambio:** occupancy de 40% a **4%**, con tope de **18** números. En tu monitor deberían verse ~18; en una ventana chica, menos.

<reproduction_steps>
1. Recargá http://127.0.0.1:8000 con hard refresh.
2. Quedate 10–15 segundos en “Digitar y Agendar”: no debería saturarse la pantalla.
3. Achicá y agrandá la ventana: la cantidad tiene que bajar o subir, sin pasarse de ~18.
4. Press Proceed/Mark as fixed when done.
</reproduction_steps>

---

**User**

The issue has been fixed. Please clean up the instrumentation.

---

**Cursor**

Saqué todos los logs de debug de `index.html`. El tope de spawn queda en **4% del área**, con un máximo de **18** números.

---

**User**

podes hacer que de base los numeros vayan un poco mas lento, sean un 15% mas grande? Ademas esta pasando algo que cuando lo abro no me aparecen los numeros

---

**Cursor**

Voy a revisar el spawn al abrir y la velocidad/tamaño, e instrumentar por qué a veces no aparecen los números.

Hay dos pedidos: números más lentos y 15% más grandes, y el bug de que **no aparecen al abrir**. Primero voy a confirmar el spawn; velocidad y tamaño los aplico en el mismo arreglo cuando tengamos la causa.

Hipótesis:
- **A:** `computeMaxActiveNumbers` hace `return result` y `result` no existe, el script corta y no spawnea nada.
- **B:** El campo todavía mide 0 al primer frame, el delay queda en 4 s o el intervalo se apaga antes de tiempo.
- **C:** Se crean números con `maxX/maxY = 0` y quedan fuera de vista.
- **D:** Otro error JS en el arranque impide llegar a `startSpawning`.
- **E:** El `main` no tiene altura y los nodos no se ven aunque existan.

<reproduction_steps>
1. Recargá http://127.0.0.1:8000 con hard refresh (si uvicorn no está arriba, levantalo con `uvicorn main:app --reload`).
2. Quedate 5–8 segundos en “Digitar y Agendar” y fijate si aparecen o no los números.
3. Press Proceed/Mark as fixed when done.
</reproduction_steps>

---

**User**

Issue reproduced, please proceed.

---

**Cursor**

Los logs confirman **A**: `ReferenceError: result is not defined` y el spawn se corta. El campo sí tiene tamaño (2520×1150). Corrijo el return y aplico números un poco más lentos y 15% más grandes.

**Causa:** al limpiar logs quedó `return result` sin definir `result`. El script cortaba al abrir (`ReferenceError`) y no spawneaba nada. El campo sí medía 2520×1150.

**También:** números ~25% más lentos y ~15% más grandes.

<reproduction_steps>
1. Recargá http://127.0.0.1:8000 con hard refresh.
2. En “Digitar y Agendar” los números tienen que aparecer en unos segundos, un poco más grandes y más lentos que antes.
3. Press Proceed/Mark as fixed when done.
</reproduction_steps>

---

**User**

The issue has been fixed. Please clean up the instrumentation.

---

**Cursor**

Saqué toda la instrumentación de `index.html`. El spawn sigue devolviendo el tope bien definido, y los números quedan más lentos y un 15% más grandes.

---

**User**

bien, podes reducir aun mas la velocida base? cuando la ventana del navegador esta en pantalla completa los numeros siguen yendo rapido

---

**Cursor**

En pantalla completa el factor de escala supera 1 y acelera de más. Voy a bajar la velocidad base y limitar ese factor.

Bajé la velocidad base y el tamaño de ventana ya no la multiplica por encima de 1, así que en pantalla completa no se disparan.

Recargá la página (hard refresh) y probá maximizada: deberían ir notablemente más despacio. En ventanas chicas siguen un poco más lentos todavía.

---

**User**

bien, ahora necesito que se agregue un login local con contraseña:
- que permita crear una un usuario con contraseña sin restricciones de nombre o contraseña, solo que la cuenta no este repetida.
- una vez creada quede guardada como hacias con la agenda. La diferencia ahora es que los contactos quedan asociados a la cuenta y solo una vez logeado en una cuenta podes verlos y agregarle mas o eliminar.
- opcion para acceder como guest avisando que los numeros guardados se perderan una vez cerrada la pagina

---

**Cursor**

El flujo de cuentas y guest está claro con el código actual; armo el plan de login local y contactos por usuario.

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

Voy a armar auth y sesiones en el backend, y después conectar la pantalla de login y los contactos por cuenta.

Quedó el login local y la agenda por cuenta.

**Cuentas:** crear usuario / entrar. El nombre no puede estar vacío ni repetido; la contraseña no tiene reglas. Se guarda en SQLite (hash + cookie de sesión).

**Contactos:** cada cuenta ve y edita solo los suyos. Recargar mantiene la sesión.

**Invitado:** aviso al entrar y en el header (`INVITADO: se pierde al cerrar`). Agendar y borrar funciona, pero no pisa la base; al recargar o **Salir**, se pierde.

Recargá [http://127.0.0.1:8000](http://127.0.0.1:8000). Si uvicorn ya estaba corriendo con `--reload`, toma `main.py` solo; si no, volvé a levantarlo.

---

**User**

necesito subir esto a mi git del que entiendo tenes acceso. La idea es que se pueda descargar y funciones con unas instructiones en un readme, te paso el link de mi git a donde quiero que lo subas?

---

**Cursor**

La carpeta todavía no es un repo git, así que **sí, pasame el link** (HTTPS o SSH) y lo conecto como `origin` y lo subo.

Mientras, dejo un `README` con cómo correrlo y un `.gitignore` para no subir `.venv` ni la base.

Quedaron [`README.md`](README.md) (cómo instalar y correr) y [`.gitignore`](.gitignore) para no subir `.venv`, `contacts.db` ni caché.

Pasame el link del repo (por ejemplo `https://github.com/usuario/repo.git`). Con eso: `git init`, commit inicial y `git push` a ese remoto. Si el repo ya tiene archivos, avisame también.

---

**User**

el link al repo ya dirijido a la carpeta donde quiero que subas el proyecto es: https://github.com/tkern99/kern-iisaia/tree/main/tp-final 

---

**Cursor**

El destino es la carpeta `tp-final` dentro de [kern-iisaia](https://github.com/tkern99/kern-iisaia/tree/main/tp-final). Voy a ver cómo está el git local y el remoto para subir ahí.

---

**User**

ya deberia ver los cambios en mi git?

