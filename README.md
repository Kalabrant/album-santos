# Álbum de los Santos

App web instalable (PWA) para coleccionar los cromos de 500 santos y advocaciones cumpliendo cada día cinco retos de vida de fe. Funciona sin conexión y guarda el progreso en el propio dispositivo.

**Abrir la app:** https://kalabrant.github.io/album-santos/ · **Enlace para instalar:** https://kalabrant.github.io/album-santos/?instalar

## Cómo funciona
- Cada día hay 5 retos (oración, Eucaristía, caridad, formación y virtud). Al cumplirlos se gana un sobre.
- Cada sobre trae 5 cromos al azar (pueden salir repetidos). Si es la fiesta litúrgica de un santo, su cromo sale seguro, y también el cromo ligado a un reto cumplido.
- Sobre de bienvenida, sobre extra en las grandes fiestas y por cada 7 días de racha.
- 10 repetidas se cambian por 1 cromo que falte.
- 35 cromos premium con brillo irisado.

## El año litúrgico (pestaña «Año»)
- **Temporadas**: Adviento y Navidad, Tiempo ordinario, Cuaresma (Camino de 40 días), Pascua (corona de flores en mayo), Corpus y verano (modo vacaciones), vuelta al cole y Todos los Santos. Se reconocen solas por la fecha.
- **Calendario de Adviento** (`data/temporadas.js`, `ADVIENTO`): una ventana con un cromo cada día, se abre entrando de 5:00 a 6:59. Con 20 ventanas, sobre premium en Navidad. Para cada año nuevo hay que añadir su lista.
- **Especial del mes**: el día de su fiesta, el cromo especial sale seguro a quien cumpla los 5 retos.
- **Medallas** (cada sección completa regala un sobre), **santo patrono y cumpleaños** (sobre extra), **diploma** al completar los 700 cromos.
- **Códigos de la parroquia**: en `admin.html` se crea un QR firmado que vale un día y una vez por móvil (sobre, sobre premium, un cromo concreto y/o recuperar una ventana de Adviento).
- **Día de gracia**: fallar un día por semana no rompe la racha. Viernes Santo sin sobres.
- **Repetidas**: canje por sección (20 repetidas) cuando faltan menos de 100, lista de busco por QR y álbumes de la familia.
- **Novedades**: la lista `NEWS` de `js/app.js`; cada aviso puede llevar la fecha desde la que se muestra.

## Añadir imágenes de santos
1. Pon los `.jpg` (con nombre «N. NOMBRE.jpg», como salen del PDF) en una carpeta.
2. Ejecuta `pip install pillow` y luego
   `python tools/actualizar_imagenes.py "RUTA/DE/LA/CARPETA"`.
   El script reduce las imágenes (completas, con su fondo), las guarda en `img/santos/NNN.webp` y actualiza `data/imagenes.js`.
3. Sube el cambio a GitHub. Los cromos sin imagen muestran un emblema de su sección.

## Archivos
- `data/santos.js`: los 500 santos (extraídos del PDF) y la marca de premium.
- `data/retos.js`: el banco de retos; el campo `s` liga un reto a un cromo.
- `js/app.js`, `css/app.css`: la app. `sw.js`: modo sin conexión (al cambiar archivos, sube `VERSION` en sw.js y el `?v=` de index.html).
