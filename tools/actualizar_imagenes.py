"""Prepara las imágenes de los santos para la app.

Uso:  python tools/actualizar_imagenes.py  CARPETA_CON_LAS_IMAGENES  [CARPETA_ESPECIALES]

- Acepta archivos .jpg/.jpeg/.png/.webp nombrados con el número ("001.jpg",
  "1 - San Pedro.jpg") o con el título del santo ("San Pedro Apóstol.jpg").
- Usa la imagen completa (con su fondo), la reduce a 600 px de ancho,
  los guarda como img/santos/NNN.webp
  y regenera data/imagenes.js, que le dice a la app qué cromos tienen imagen.
Necesita:  pip install pillow
"""
import json, re, sys, time, unicodedata
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "img" / "santos"

def norm(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", t).strip()

def load_santos():
    js = (ROOT / "data" / "santos.js").read_text(encoding="utf-8")
    data = json.loads(js[js.index("{"): js.rindex("}") + 1])
    return data["santos"]

def main():
    santos = load_santos()
    by_name = {}
    by_letter = {s["l"]: s["n"] for s in santos if s.get("l")}
    for s in santos:
        for k in (s["name"], s["short"], re.sub(r"\(.*?\)", "", s["name"])):
            by_name.setdefault(norm(k), s["n"])
    OUT.mkdir(parents=True, exist_ok=True)
    srcs = [Path(a) for a in sys.argv[1:]] or [OUT]
    done, unknown = {}, []
    for f in sorted(x for src in srcs for x in src.iterdir()):
        if f.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        m = re.match(r"^\s*(\d{1,3})(?!\d)", f.stem)
        le = re.match(r"^([A-Z])\.\s", f.stem)  # cromos especiales: "A. ...", "B. ..."
        n = int(m.group(1)) if m and 1 <= int(m.group(1)) <= 700 else by_letter.get(le.group(1)) if le else by_name.get(norm(f.stem))
        if not n:
            key = norm(f.stem)
            n = next((v for k, v in by_name.items() if key and (key in k or k in key)), None)
        if not n:
            unknown.append(f.name); continue
        dest = OUT / f"{n:03d}.webp"
        if f.resolve() != dest.resolve():
            im = Image.open(f).convert("RGB")
            if im.width > 600:
                im = im.resize((600, round(im.height * 600 / im.width)), Image.LANCZOS)
            im.save(dest, "WEBP", quality=82, method=6)
        done[n] = "webp"
    for f in OUT.glob("*.webp"):
        if re.fullmatch(r"\d{3}", f.stem):
            done.setdefault(int(f.stem), "webp")
    (ROOT / "data" / "imagenes.js").write_text(
        "/* Generado por tools/actualizar_imagenes.py: cromos que ya tienen imagen */\nwindow.IMAGENES = "
        + json.dumps({str(k): v for k, v in sorted(done.items())}) + ";\n"
        + f"window.IMAGENES_V = {int(time.time())};\n", encoding="utf-8")
    print(f"{len(done)} imágenes listas en img/santos/.")
    if unknown:
        print("No supe a qué santo corresponden:", *unknown, sep="\n  ")

if __name__ == "__main__":
    main()
