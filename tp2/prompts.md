# Prompts — API de Catálogo de Libros

El registro del proceso, en orden. Tres prompts en una sola conversación para armar un contrato OpenAPI plano y filtrable.

---

## 1 — Prompt inicial (Estructura plana y separación de schemas)

```text
Necesito un openapi.yaml (3.1) para una API de catálogo de libros.

recursos:
  Author { id, name, bio }
  Book   { id, title, author_id }

endpoints:
  GET    /authors       → 200 lista
  POST   /authors       → 201 / 400 si falta name
  GET    /books         → 200 lista
  POST   /books         → 201 / 400 si falta title o author_id

Los schemas de entrada y de salida son distintos: el de salida incluye
el id que genera el servidor, el de entrada no.
La estructura debe ser plana, no anides los paths.
```

**Qué buscaba:** Fijar los recursos base asegurando que vivan en rutas separadas desde el principio. También reforzar la lección del ejercicio anterior pidiendo explícitamente schemas distintos para Input/Output.

**Qué devolvió:** El YAML base con los paths `/authors` y `/books`. Cumplió con no anidarlos y separó correctamente las entidades `Author`/`AuthorInput` y `Book`/`BookInput`.

---

## 2 — Agregar el filtro opcional

```text
Ahora agregá la posibilidad de filtrar libros por autor. En el GET /books, sumá un query parameter opcional llamado `author_id`. Mantené todo lo demás igual.
```

**Qué buscaba:** Justificar la decisión de la ruta plana agregando el mecanismo de búsqueda estándar de REST. Hacerlo opcional es la clave para que `GET /books` siga sirviendo para pedir el catálogo entero de la librería.

**Qué devolvió:** Modificó únicamente el endpoint `GET /books` agregando la sección `parameters` con `in: query` para el campo `author_id`.

---

## 3 — Incorporar multidimensionalidad (Relaciones N:M)

```text
Sumemos un tercer recurso independiente: Genre { id, name } con su GET y POST correspondientes.
Como un libro puede pertenecer a varios géneros, agregá la propiedad `genre_ids` (array de integers) al schema de entrada y de salida de los libros.
Por último, sumá `genre_id` como otro query parameter opcional en el GET /books.
```

**Qué buscaba:** Introducir la complejidad que termina de validar el modelo arquitectónico. Una relación de muchos a muchos ("un libro tiene varios géneros") es casi imposible de modelar de forma limpia con rutas anidadas.

**Qué devolvió:** Agregó el path `/genres`, actualizó los schemas de `Book` y `BookInput` para aceptar un array de elementos en la propiedad `genre_ids`, y sumó el nuevo filtro `genre_id` al endpoint de búsqueda de libros.

---

## Conversación completa

Una sola conversación de tres pasos. El contrato final soporta filtrado multidimensional sin sacrificar la independencia de las entidades.
