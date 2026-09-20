# TP2 — API de Catálogo de Libros (Estructura Plana)

Un `openapi.yaml` que describe una API con una arquitectura plana, usando query parameters para filtrar. Tres endpoints raíz, sin anidamiento: el entregable es el contrato.

## Qué me propuse construir

Un dominio donde la jerarquía estricta se rompe. Necesitaba recursos que existieran por sí mismos y tuvieran relaciones de muchos a muchos, para demostrar que anidar rutas (ej. `/authors/{id}/books`) era una mala decisión arquitectónica. Autores, géneros y libros cumplen esto: un autor existe sin libros, y un libro puede tener varios géneros simultáneamente. Salió en tres prompts, en una sola conversación iterativa.

## Decisiones que tomé yo

**Estructura plana en vez de rutas anidadas.** Los tres recursos viven en la raíz (`/authors`, `/books`, `/genres`). Al no anidar los libros dentro de los autores, evito el problema de qué hacer cuando quiero buscar un libro por género o pedir el catálogo entero.

**Filtros con Query Parameters.** En lugar de usar la URL para definir pertenencia, usé `?author_id=` y `?genre_id=` en el `GET /books`. Esto permite multidimensionalidad: buscar el catálogo completo (sin parámetros), filtrar por una dimensión, o cruzar ambas.

**Manejo de relaciones N a M con arrays.** Al separar los géneros como recurso de primer nivel, la relación con el libro se maneja pasando una lista de IDs (`genre_ids: [1, 5]`) en el cuerpo de la petición (`BookInput`).

**Schemas de entrada y salida separados.** Mantuve la regla aprendida en el TP anterior. El cliente manda el recurso sin ID, y el servidor lo devuelve con el ID generado, evitando colisiones semánticas.

## Qué salió mal (y qué dejé pasar)

Mirando el YAML final, hay una inconsistencia de tipado generada por el modelo: `id` y `author_id` en `Author` y `Book` quedaron definidos como `string`, pero el `id` de `Genre` quedó como `integer`. Además, el array de géneros en el libro pide `integer`. 

Como mis prompts no especificaban explícitamente el tipo de dato de los identificadores, el modelo asumió tipos distintos en distintos momentos. No lo corregí con un cuarto prompt porque el objetivo del ejercicio (la estructura plana y los filtros) ya estaba cumplido, pero en un entorno de producción obligaría a unificar todo a UUIDs (`string`) o IDs secuenciales (`integer`).

## Prompts

El registro completo está en `prompts.md`. La clave fue ir de a poco: primero la estructura plana básica, segundo la lógica de filtrado, y tercero la complejidad de la relación múltiple con los géneros.
