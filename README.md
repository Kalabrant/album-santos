# Álbum de los Santos

App web instalable (PWA) para coleccionar los cromos de 500 santos y advocaciones cumpliendo cada día cinco retos de vida de fe. Funciona sin conexión y guarda el progreso en el propio dispositivo.

**Abrir la app:** https://kalabrant.github.io/album-santos/

## Cómo funciona
- Cada día hay 5 retos (oración, Eucaristía, caridad, formación y virtud). Al cumplirlos se gana un sobre.
- Cada sobre trae 5 cromos al azar (pueden salir repetidos). Si es la fiesta litúrgica de un santo, su cromo sale seguro, y también el cromo ligado a un reto cumplido.
- Sobre de bienvenida, sobre extra en las grandes fiestas y por cada 7 días de racha.
- 10 repetidas se cambian por 1 cromo que falte.
- 35 cromos premium con brillo irisado.

## Añadir imágenes de santos
1. Pon los `.jpg` (con nombre «N. NOMBRE.jpg», como salen del PDF) en una carpeta.
2. Ejecuta `pip install pillow opencv-python-headless numpy` y luego
   `python tools/actualizar_imagenes.py "RUTA/DE/LA/CARPETA"`.
   El script quita el fondo gris, reduce las imágenes, las guarda en `img/santos/NNN.webp` y actualiza `data/imagenes.js`.
3. Sube el cambio a GitHub. Los cromos sin imagen muestran un emblema de su sección.

## Archivos
- `data/santos.js`: los 500 santos (extraídos del PDF) y la marca de premium.
- `data/retos.js`: el banco de retos; el campo `s` liga un reto a un cromo.
- `js/app.js`, `css/app.css`: la app. `sw.js`: modo sin conexión (sube `VERSION` al cambiar archivos).
