# TP1 — Digitador Tiro al Blanco

Un input de número telefónico donde los dígitos rebotan por la pantalla y tenés que "dispararles" para atraparlos. La idea es cargar tu número es un test de reflejos.

## Cómo se ejecuta

Doble click en `index.html`. Un solo archivo, sin dependencias.

## Qué me propuse construir

Una bad UI que genera fricción a través del apuintado y la presión del tiempo. Los números duran solo 4 segundos vivos y se mueven rápido. No hay trampas ocultas, solo una interfaz inherentemente difícil de operar. Salió en seis prompts, en una sola conversación iterativa.

## Decisiones que tomé yo

**DOM en vez de `<canvas>`.** La restricción principal. Renderizar elementos rebotando y chocando es territorio tradicional de canvas, pero pedí explícitamente que los números fueran elementos HTML (`div` o `span`). Esto me permite inspeccionar el DOM en vivo e interactuar mediante eventos de click estándar.

**Bolsa de Tetris (RNG).** El `Math.random()` puro generaba grupos de números repetidos y frustraba al usuario por falta del dígito que necesitaba. Usar el sistema de "bolsa" (mezclar los 10 dígitos y sacarlos uno por uno) garantiza que salgan todos antes de que se repita el ciclo, asegurando diversidad visual en el campo de tiro.

**Borrar con Drag & Drop.** Podría haber puesto un botón de "Borrar último", pero en su lugar implementé un tacho de basura donde hay que arrastrar físicamente el número equivocado. Añade una capa más de interacción manual que contrasta con el "disparo" rápido inicial.

**Físicas y colisiones.** Inicialmente los números se movían por su cuenta, pero se superponían y se tapaban. Unificarlos bajo un bucle centralizado con `requestAnimationFrame` y hacer que reboten entre sí los convirtió en objetos sólidos.

## Qué salió mal y cómo lo corregí

La iteración fue bastante orgánica, pero hubo detalles a mejorear em la implementación.

Primero, la generación inicial los hacía aparecer y desaparecer a los 8 al mismo tiempo, como un parpadeo masivo. Lo corregí pidiendo un spawn escalonado para que el flujo de números en pantalla fuera constante.

Segundo, al integrar el motor de físicas en el paso 5, el modelo cometió un error de tipeo duplicando una declaración de función, lo que rompió el bloque y tiró un `Unexpected end of input`. Tuve que señalarle el error para que balanceara las llaves nuevamente. 

Por último, la mecánica de borrado (Drag & Drop) era invisible. La funcionalidad estaba bien, pero un usuario nuevo le cortaria adivina que puede arrastrar el número. Lo resolví en el último prompt pidiendo explícitamente un texto de instrucciones en la UI para darle instrucciones a la mecánica.

## Prompts

El registro completo está en [prompts.md](tp1/prompts.md). Los que más pesaron son el primero, que armó el contenedor y las reglas de vida del número, y el de las físicas, que cambió el metodo de movimiento.
