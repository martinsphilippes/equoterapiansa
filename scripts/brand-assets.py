"""Gera os ativos de marca a partir da logomarca oficial (PNG).
Recorta o símbolo (praticante + cavalo) e a logo completa com fundo transparente,
em branco (para fundos azuis) e em azul institucional (para fundos claros),
e compõe os ícones do PWA com área segura para o formato maskable.
Uso: python3 scripts/brand-assets.py caminho/da/logo.png caminho/do/glow.png
"""
import sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

SRC, GLOW = sys.argv[1], sys.argv[2]
PRIMARY = (20, 32, 180)      # #1420B4
PRIMARY_700 = (14, 19, 148)  # #0E1394
PRIMARY_500 = (36, 51, 214)  # #2433D6

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.float32)
# whiteness: o canal R é baixo no halo azul e alto nas formas brancas
alpha = np.clip((a[:, :, 0] - 140) / (255 - 140), 0, 1)

def cut(box, color, out):
    x0, y0, x1, y1 = box
    al = (alpha[y0:y1, x0:x1] * 255).astype(np.uint8)
    rgba = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    rgba[:, :, 0], rgba[:, :, 1], rgba[:, :, 2] = color
    rgba[:, :, 3] = al
    img = Image.fromarray(rgba, "RGBA")
    img.save(out, optimize=True)
    return img

WHITE = (255, 255, 255)
pad = 6
symbol_box = (346 - pad, 83 - pad, 1322 + pad, 589 + pad)
logo_box = (131 - pad, 83 - pad, 1410 + pad, 937 + pad)
sym_w = cut(symbol_box, WHITE, "public/brand/symbol-white.png")
cut(symbol_box, PRIMARY, "public/brand/symbol-blue.png")
cut(logo_box, WHITE, "public/brand/logo-white.png")
cut(logo_box, PRIMARY, "public/brand/logo-blue.png")
# marca horizontal compacta (símbolo pequeno) já é o próprio símbolo; wordmark separado:
cut((131 - pad, 590, 1410 + pad, 937 + pad), WHITE, "public/brand/wordmark-white.png")
cut((131 - pad, 590, 1410 + pad, 937 + pad), PRIMARY, "public/brand/wordmark-blue.png")

# textura de brilho para fundos (login/família)
g = Image.open(GLOW).convert("RGB").resize((1024, 683), Image.LANCZOS)
g.save("public/brand/glow.jpg", quality=62, optimize=True, progressive=True)

def bg(size, radius=0):
    """Fundo azul com gradiente radial suave."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    cx, cy = size * 0.5, size * 0.42
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (size * 0.75)
    d = np.clip(d, 0, 1)
    c0, c1 = np.array(PRIMARY_500, np.float32), np.array(PRIMARY_700, np.float32)
    rgb = (c0 * (1 - d[..., None]) + c1 * d[..., None]).astype(np.uint8)
    img = Image.fromarray(rgb, "RGB").convert("RGBA")
    if radius:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
        img.putalpha(mask)
    return img

def icon(size, symbol_ratio, out, radius=0):
    base = bg(size, radius)
    w = int(size * symbol_ratio)
    h = int(w * sym_w.height / sym_w.width)
    s = sym_w.resize((w, h), Image.LANCZOS)
    base.alpha_composite(s, ((size - w) // 2, (size - h) // 2))
    base.save(out, optimize=True)
    return base

# "any": símbolo grande (74% da largura). Maskable: símbolo dentro da zona segura central (58%).
icon(512, 0.74, "public/icons/icon-512.png")
icon(192, 0.74, "public/icons/icon-192.png")
icon(512, 0.58, "public/icons/icon-512-maskable.png")
icon(192, 0.58, "public/icons/icon-192-maskable.png")
icon(180, 0.74, "public/icons/apple-touch-icon.png")
# favicon: cantos arredondados, símbolo um pouco maior para legibilidade
fav = icon(256, 0.8, "public/icons/favicon-256.png", radius=48)
fav.save("src/app/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
icon(64, 0.8, "public/icons/favicon-64.png", radius=12)
print("ok", sym_w.size)
