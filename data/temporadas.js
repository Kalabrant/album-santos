/* Calendario del año: temporadas litúrgicas, Calendario de Adviento y retos de temporada.
   Las fechas móviles (Pascua, Ceniza, Pentecostés…) se calculan en js/app.js. */

/* Temporadas del año (se reconocen por la fecha) */
window.TEMPORADAS = {
  adviento: { nombre: "Velad: la Luz que viene", e: "🕯️", tiempo: "Adviento y Navidad",
    lema: "Prepara el camino al Señor. Cada mañana de Adviento se abre una ventana del calendario." },
  llamados: { nombre: "Llamados", e: "📣", tiempo: "Tiempo ordinario",
    lema: "Dios llama a cada uno por su nombre. Completa secciones del álbum y gana medallas." },
  cuaresma: { nombre: "Camino de 40 días", e: "✝️", tiempo: "Cuaresma",
    lema: "Cada día con los cinco retos cumplidos avanzas un paso hacia la Pascua." },
  pascua: { nombre: "¡Ha resucitado!", e: "🌅", tiempo: "Pascua",
    lema: "Cincuenta días de fiesta. En mayo, teje una corona de flores para la Virgen." },
  corazon: { nombre: "Corazón y camino", e: "❤️‍🔥", tiempo: "Corpus, Sagrado Corazón y verano",
    lema: "En julio y agosto, modo vacaciones: tu racha aguanta aunque descanses unos días." },
  volvemos: { nombre: "Volvemos", e: "🎒", tiempo: "Vuelta al cole, catequesis y Rosario",
    lema: "Empieza el curso: invita a tu familia y a tus amigos de catequesis." },
  santos: { nombre: "Todos los Santos", e: "👑", tiempo: "Noviembre",
    lema: "El mes de los santos: ¡la fiesta de todo el álbum!" },
};

/* Calendario de Adviento: un cromo por día (fecha → número de cromo).
   La ventana de cada día se abre entrando en la app entre las 5:00 y las 6:59. */
window.ADVIENTO = {
  2026: {
    "2026-11-29": 165, "2026-11-30": 71, "2026-12-01": 296, "2026-12-02": 552, "2026-12-03": 226, "2026-12-04": 94,
    "2026-12-05": 532, "2026-12-06": 210, "2026-12-07": 198, "2026-12-08": 22, "2026-12-09": 436, "2026-12-10": 42,
    "2026-12-11": 376, "2026-12-12": 25, "2026-12-13": 90, "2026-12-14": 239, "2026-12-15": 516, "2026-12-16": 8,
    "2026-12-17": 409, "2026-12-18": 64, "2026-12-19": 412, "2026-12-20": 24, "2026-12-21": 59, "2026-12-22": 368,
    "2026-12-23": 69, "2026-12-24": 411, "2026-12-25": 6,
  },
};

/* Cuaresma: uno de los retos del día se cambia por uno de estos */
window.RETOS_CUARESMA = [
  { c: "vida", t: "Haz un pequeño ayuno: renuncia hoy a un dulce o a un capricho y ofréceselo a Jesús" },
  { c: "oracion", t: "Reza el Vía Crucis (o al menos una estación) pensando en lo que Jesús sufrió por ti" },
  { c: "caridad", t: "Guarda una moneda o algo tuyo para dárselo a los pobres" },
  { c: "vida", t: "Apaga las pantallas una hora y dedica ese tiempo a tu familia" },
  { c: "formacion", t: "Lee un trozo de la Pasión de Jesús en el Evangelio" },
  { c: "sacramentos", t: "Prepara una buena confesión con un examen de conciencia" },
  { c: "caridad", t: "Perdona de corazón a alguien que te ofendió" },
  { c: "vida", t: "Pasa todo el día sin quejarte" },
  { c: "vida", t: "Come lo que te sirvan sin protestar y da gracias" },
  { c: "oracion", t: "Reza por los que sufren: enfermos, presos y migrantes" },
  { c: "caridad", t: "Haz una obra de misericordia: visita, ayuda o acompaña a alguien" },
  { c: "oracion", t: "Besa el crucifijo y dile a Jesús: gracias por amarme tanto" },
  { c: "oracion", t: "Mira una cruz cinco minutos en silencio" },
  { c: "caridad", t: "Ayuda en casa en algo que no te toca" },
  { c: "caridad", t: "Comparte tu merienda o algo tuyo con alguien" },
  { c: "oracion", t: "Reza un Padrenuestro por la persona que peor te cae" },
  { c: "formacion", t: "Lee la parábola del hijo pródigo (Lucas 15) y piensa en el abrazo del Padre" },
  { c: "vida", t: "Levántate a la primera, sin remolonear, y ofrécelo" },
  { c: "sacramentos", t: "Visita a Jesús en el Sagrario y acompáñalo un rato" },
  { c: "vida", t: "Ofrece un sacrificio escondido que nadie note" },
];
/* Los viernes de Cuaresma */
window.RETO_VIERNES_CUARESMA = { c: "vida", t: "Viernes de Cuaresma: no comas carne (desde los 14 años) o, si eres pequeño, ofrece otro sacrificio" };

/* Viernes Santo: hoy no hay sobres; solo acompañar a Jesús */
window.RETOS_VIERNES_SANTO = [
  { c: "oracion", t: "Reza el Vía Crucis, en la parroquia o en casa" },
  { c: "sacramentos", t: "Participa en los Oficios de la Pasión del Señor (a las 3 de la tarde)" },
  { c: "caridad", t: "Haz ayuno y abstinencia (desde los 14 años) o, si eres pequeño, ofrece un sacrificio" },
  { c: "formacion", t: "Lee la Pasión según San Juan (capítulos 18 y 19)" },
  { c: "vida", t: "Guarda un rato de silencio mirando la cruz" },
];

/* Verano (julio y agosto): uno de los retos del día se cambia por uno de estos */
window.RETOS_VERANO = [
  { c: "oracion", t: "Reza en familia antes de un viaje o de un paseo" },
  { c: "sacramentos", t: "Visita una iglesia o un santuario nuevo y reza allí" },
  { c: "formacion", t: "Lee en el álbum la vida de un santo que no conocías" },
  { c: "caridad", t: "Ayuda en casa en algo grande: limpiar, ordenar o cocinar" },
  { c: "oracion", t: "Contempla el mar, la montaña o el cielo y alaba a Dios" },
  { c: "sacramentos", t: "Ve a Misa el domingo aunque estés de vacaciones" },
  { c: "caridad", t: "Juega con tus hermanos o tus primos sin pantallas" },
  { c: "vida", t: "Invita a un amigo a rezar contigo" },
  { c: "oracion", t: "Da gracias a Dios por tres cosas de tu verano" },
  { c: "oracion", t: "Haz una caminata rezando un misterio del Rosario" },
];

/* Retos de la semana de temporada (sustituyen al reto de la semana normal) */
window.SEMANAS_CUARESMA = [
  "Confiésate antes de Semana Santa",
  "Reza el Vía Crucis en la parroquia un viernes",
  "Haz una colecta en familia para los pobres",
  "Ayuna de redes sociales o de videojuegos un día entero y ofrécelo",
  "Lee la Pasión según San Marcos (capítulos 14 y 15)",
  "Reconcíliate con alguien con quien estés peleado",
];
window.SEMANAS_ESPECIALES = {
  santa: "Semana Santa: participa con tu familia en los Oficios del Jueves y del Viernes Santo y en la Vigilia Pascual",
  bosco: "Semana de los jóvenes santos: lee la vida de un santo joven (San Juan Bosco, Domingo Savio, Carlo Acutis…) y cuéntasela a un amigo",
  flores: "Mes de María: lleva flores a la Virgen en tu parroquia y rézale un Rosario",
  jmj: "Semana de la JMJ de Seúl: reza por los jóvenes del mundo y conoce a los mártires de Corea (San Andrés Kim, San Pablo Chong)",
  rosario: "Semana del Rosario: reza el Rosario en familia al menos tres días",
  domund: "Semana del Domund: reza por los misioneros y da una limosna para las misiones",
  santos: "Semana de Todos los Santos: visita el cementerio, reza por tus difuntos y cuenta a alguien la vida de tu santo favorito",
};
