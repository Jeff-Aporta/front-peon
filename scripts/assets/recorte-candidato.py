"""Quita el fondo negro de la foto del candidato (alfa limpio, borde suave) y saca las versiones WebP.

Uso: python recorte.py <original.webp> <carpeta_salida> <carpeta_previas>
El fondo es negro puro conectado al borde: se inunda desde el borde lo que está por debajo de un umbral, y el alfa
del borde se suaviza con la luminancia (los pelos oscuros quedan semitransparentes en vez de recortados en escalón).
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

src, out, prev = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32)
lum = a.max(axis=2)

# 1) Máscara del fondo: oscuro (<UMBRAL) y conectado al borde (flood fill desde varias semillas del borde).
UMBRAL = 26
oscuro = Image.fromarray(((lum < UMBRAL) * 255).astype(np.uint8)).copy()  # copia: fromarray comparte memoria de solo lectura
h, w = lum.shape
marca = 128
for x in range(0, w, 7):
    for y in (0, h - 1):
        if oscuro.getpixel((x, y)) == 255:
            ImageDraw.floodfill(oscuro, (x, y), marca)
for y in range(0, h, 7):
    for x in (0, w - 1):
        if oscuro.getpixel((x, y)) == 255:
            ImageDraw.floodfill(oscuro, (x, y), marca)
fondo = np.asarray(oscuro) == marca
# Las casillas negras del tablero tocan el fondo: se recuperan con un cierre morfológico del sujeto en esa zona.
x0, y0, x1, y1 = 0, 1030, 380, 1175
zona = Image.fromarray(((~fondo[y0:y1, x0:x1]) * 255).astype(np.uint8))
cerrada = np.asarray(zona.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.MinFilter(41))) > 0
fondo[y0:y1, x0:x1] &= ~cerrada

# 2) Alfa: 0 en el fondo, 255 dentro; en la franja del borde, rampa por luminancia (UMBRAL→70) para un borde suave.
alfa = np.where(fondo, 0.0, 255.0)
borde = np.asarray(Image.fromarray((fondo * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
franja = borde & ~fondo
rampa = np.clip((lum - 8) / (70 - 8), 0, 1) * 255
alfa[franja] = np.minimum(alfa[franja], rampa[franja])
alfa_img = Image.fromarray(alfa.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
# Dentro del sujeto no se toca nada (el desenfoque solo debe suavizar el contorno).
alfa = np.where(fondo | franja, np.asarray(alfa_img), 255).astype(np.uint8)

# 3) Que case con la página clara: un punto más de luz y algo menos de contraste (la foto viene muy dura).
# Sin halo oscuro: en el contorno, el color observado es alfa·frente (el fondo era negro) → frente = observado/alfa.
rgb = a.copy()
k = (alfa > 0) & (alfa < 255)
rgb[k] = np.clip(rgb[k] / (alfa[k, None] / 255.0), 0, 255)
im = Image.fromarray(rgb.astype(np.uint8))
foto = ImageEnhance.Brightness(im).enhance(1.06)
foto = ImageEnhance.Contrast(foto).enhance(0.94)
rgba = foto.convert('RGBA')
rgba.putalpha(Image.fromarray(alfa))

# Recorte al contenido (sin márgenes transparentes).
caja = rgba.getbbox()
completa = rgba.crop(caja)

# 4) Retrato sin el logotipo de abajo: hasta antes del texto «Fredisney» (≈ y 820 del original) con un desvanecido.
corte = 830 - caja[1]
retrato = completa.crop((0, 0, completa.width, corte))
ra = np.asarray(retrato).copy()
alto = 140
for i in range(alto):
    fila = ra.shape[0] - alto + i
    ra[fila, :, 3] = (ra[fila, :, 3] * (1 - i / alto)).astype(np.uint8)
retrato = Image.fromarray(ra)

# 5) Busto para el héroe: más estrecho (centrado en la cabeza) para que la foto llene el alto de la portada sin
#    quedar chica; los bordes laterales se desvanecen (los brazos cruzados llegan al borde de la foto).
bb = np.asarray(retrato)
cab = np.where(bb[100:420, :, 3].max(axis=0) > 200)[0]
centro = (int(cab.min()) + int(cab.max())) // 2
ancho_b = int(retrato.height * 0.94)
x0b = max(0, min(retrato.width - ancho_b, centro - ancho_b // 2))
busto = np.asarray(retrato.crop((x0b, 0, x0b + ancho_b, retrato.height))).copy()
lado = int(ancho_b * 0.12)
for i in range(lado):
    f = i / lado
    busto[:, i, 3] = (busto[:, i, 3] * f).astype(np.uint8)
    busto[:, -1 - i, 3] = (busto[:, -1 - i, 3] * f).astype(np.uint8)
busto = Image.fromarray(busto)
busto.resize((busto.width * 760 // busto.height, 760), Image.LANCZOS).save(f'{out}/candidato-busto.webp', 'WEBP', quality=86, method=6)
busto.resize((busto.width * 420 // busto.height, 420), Image.LANCZOS).save(f'{out}/candidato-busto-420.webp', 'WEBP', quality=84, method=6)

completa.save(f'{out}/candidato-completo.webp', 'WEBP', quality=86, method=6)
retrato.resize((retrato.width * 720 // retrato.height, 720), Image.LANCZOS).save(f'{out}/candidato-retrato.webp', 'WEBP', quality=86, method=6)
retrato.resize((retrato.width * 360 // retrato.height, 360), Image.LANCZOS).save(f'{out}/candidato-retrato-360.webp', 'WEBP', quality=84, method=6)

# Previas sobre fondo claro y sobre morado para revisar el borde.
for nombre, color in (('claro', (246, 248, 250)), ('morado', (91, 31, 166))):
    for etiqueta, img in (('completa', completa), ('retrato', retrato)):
        lienzo = Image.new('RGB', img.size, color)
        lienzo.paste(img, mask=img.split()[3])
        lienzo.thumbnail((700, 700))
        lienzo.save(f'{prev}/previa-{etiqueta}-{nombre}.png')
print('caja', caja, 'completa', completa.size, 'retrato', retrato.size)
