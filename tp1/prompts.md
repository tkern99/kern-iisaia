# Prompts — Digitador Tiro al Blanco

El registro del proceso, en orden. Seis prompts en una sola conversación. El artefacto quedó terminado incorporando físicas, un sistema de bolsa de números y drag-and-drop.

---

## 1 — Prompt inicial

```text
Construí un digitador de número telefónico interactivo tipo "tiro al blanco" con números en movimiento.

Estructura:
- <main> con el área de captura o "campo de tiro": un contenedor principal grande que ocupa
la mayor parte de la pantalla donde aparecerán y se moverán los números.
- Un separador horizontal de una línea amarilla sólida que
divide el área de los números del panel de control.
- <footer> con el panel de ingreso: un texto que dice "numero telefonico:" alineado a la izquierda,
seguido de una caja de visualización con borde rojo resaltado y un símbolo "+" inicial,  donde se irán
concatenando los dígitos que el usuario logre atrapar.

Estilo:
- Estética retro: paleta de colores beige, crema y gris claro simulando el plástico de la tecnología
antigua (estilo computadoras de los 90s).
- Bordes duros, sin redondeo, y tipografía clásica de sistema.
- El cursor del mouse: al entrar en el área del <main>, el puntero del sistema se oculta o
se reemplaza obligatoriamente por una mira de precisión (cursor: crosshair).
- Los números flotantes deben verse como texto simple pero ser lo suficientemente grandes para poder apuntarles.

Comportamiento:
- Estado: cadena de texto con el número telefónico actual, y un registro de los números activos en pantalla.
- Ciclo de aparición: Siempre debe haber exactamente 8 números en pantalla en todo momento.
Los números mostrados son dígitos aleatorios del 0 al 9.
- Tiempo de vida: Cada dígito tiene un tiempo de vida estricto de 2 segundos.
Una vez transcurridos los 2 segundos, el número desaparece de la pantalla e inmediatamente se genera
uno nuevo en una posición aleatoria para mantener el límite de 8.
- Movimiento errático: Durante sus 2 segundos de vida, cada número se mueve de manera errática y aleatoria
dentro de los límites del contenedor <main>, actualizando su posición constantemente mediante JS o animaciones CSS.
- Interacción (Digitación): Al hacer click (apuntar y disparar con la mira) sobre uno de los números en movimiento,
ese dígito se captura y se agrega al final del número telefónico mostrado en la caja con borde rojo del <footer>.

Constraints:
- Un solo archivo HTML, con el CSS integrado en un tag <style> y toda la lógica en un <script>.
- Todo debe ejecutarse desde el navegador simplemente abriendo el archivo local, sin necesidad de servidores.
- Vanilla JS, sin frameworks y sin librerías externas (como jQuery o librerías de físicas).
- Elementos del DOM: Los números flotantes deben ser elementos HTML individuales (por ejemplo, <span> o <div>)
posicionados de manera absoluta mediante CSS y actualizados con JS. No usar <canvas>, para mantener el DOM directamente
 e interactuar a través de eventos de click estándar en los elementos.
```

**Qué intentaba lograr:** Plantear la base completa del artefacto de un solo golpe. Definir la estructura semántica (`main`, `footer`), el estilo visual retro, la mecánica de cursor en forma de mira y las restricciones de empaquetado (un solo archivo, Vanilla JS, DOM puro sin `<canvas>`).

**Qué devolvió:** Un prototipo funcional que respetaba el diseño retro, con 8 números que se movían erráticamente durante 2 segundos y desaparecían al mismo tiempo para volver a generarse. 

---

## 2 — Iterar sobre el movimiento y los tiempos

```text
bien, ahora cambia el tipo de movimiento para que se muevan en diagonal pero a distintos angulos.
Tambien modifica la aparicion para que los 8 numeros no aparezcan y desaparezcan al mismo tiempo,
si no que de a poco vayan saliendo por la pantalla. Tambien hace que duren 3 segundos en vez de 2.
```

**Qué intentaba lograr:** Suavizar el flujo visual. El primer intento los hacía aparecer y desaparecer todos de golpe. Al escalonarlos y usar un movimiento diagonal continuo en vez de saltos erráticos, el campo se siente más como un juego arcade.

**Qué devolvió:** Se modificó el bucle de actualización. Los números empezaron a generarse de forma progresiva con `setTimeout`, el tiempo de vida subió a 3 segundos y el movimiento se cambió a un vector direccional (`vx`, `vy`) simulando un rebote básico contra los bordes.

---

## 3 — Velocidad y borrado con Drag & Drop

```text
Ahora hace que los numeros se muevan 50% mas rapido pero duren 4 segundos.
Tambien agrega un tacho de basura al lado de la casilla donde van los numero para poder eliminarlos.
La idea es que yo pueda arrastrar el numero que quiera eliminar hacia el tacho y al soltar el clik este se
elimine moviendo todos los numeros a la derecha del numero eliminado hacia la izquierda
```

**Qué intentaba lograr:** Balancear la dificultad (más rápido pero más tiempo en pantalla) e introducir una mecánica intuitiva para corregir errores al tipear.

**Por qué está escrito así:** Se especificó el comportamiento exacto tras eliminar ("moviendo todos los números a la derecha... hacia la izquierda") para asegurar que el modelo manejara el display como una matriz de elementos dinámicos y no como un simple texto concatenado.

**Qué devolvió:** Aumento del multiplicador de velocidad, ajuste del temporizador de vida a 4s y división de la visualización del teléfono en `div` individuales con el atributo `draggable="true"`. Se implementó el tacho de basura funcional mediante los eventos de arrastre nativos del navegador.

---

## 4 — Mejorar la aleatoriedad (Tetris Bag)

```text
parece que una vez que se elige un numero los proximos en aparecer lo repiten al menos dos veces.
modifica la manera en que se generan para que sea realmente aleatorio y haya mas diversidad de numeros en pantalla
```

**Qué intentaba lograr:** Solucionar un problema clásico del RNG. La aleatoriedad pura genera rachas, lo que en pantalla se veía como poca variedad.

**Qué devolvió:** La implementación de una un array con los dígitos del 0 al 9 que se mezcla y del cual se sacan elementos hasta vaciarse, garantizando que todos los números aparezcan antes de repetirse, dando una percepción de aleatoriedad mucho mejor.

---

## 5 — Físicas y Colisiones

```text
bien por ultimo hace que los numeros sea bloques fisicos y por ende cuando se encuentren reboten y no se superpongan.
tambien fijate que no se solapen al aparecer
```

**Qué intentaba lograr:** Darle un poco de fisica y evitar que los objetivos fueran imposibles de clickear por estar agrupados o tapándose entre sí.

**Qué devolvió:** Se reemplazó el movimiento individual por un bucle centralizado con `requestAnimationFrame`. Se implementó detección de colisiones entre rectángulos (AABB) y resolución de rebote elástico. Además, al momento de spawnear, el script ahora verifica superposiciones para buscar coordenadas libres.

---

## 6 — UI / UX: Instrucciones

```text
tambien agregale un texto en la parte izquierda que le indique al usuario como eliminar un numero
```

**Qué intentaba lograr:** Hacer la mecánica de Drag & Drop evidente, ya que sin un indicador visual los usuarios rara vez adivinan que pueden arrastrar elementos de la interfaz.

**Qué devolvió:** Un recuadro de ayuda estilizado posicionado a la izquierda del `footer`, usando `margin-right: auto` para empujar correctamente la pantalla del número a la derecha y manteniendo el layout equilibrado.

---

## Conversación completa

Una sola conversación de Gemini Canvas iterando sobre el mismo archivo. El artefacto final combina manipulación del DOM, Drag & Drop nativo y un motor de físicas 2D en un único HTML.
