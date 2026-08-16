"""Generate compact pixel icons and house sigils for Oaths & Ashes."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "public" / "assets"
ICONS = ROOT / "icons"
SIGILS = ROOT / "sigils"
BANNERS = ROOT / "banners"


def save_scaled(pixels: list[str], path: Path, palette: dict[str, tuple[int, int, int, int]], scale: int = 4) -> None:
    h = len(pixels)
    w = len(pixels[0])
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(pixels):
        for x, ch in enumerate(row):
            if ch != ".":
                px[x, y] = palette[ch]
    out = img.resize((w * scale, h * scale), Image.NEAREST)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path)


def make_icon(name: str, pixels: list[str], palette: dict[str, tuple[int, int, int, int]]) -> None:
    save_scaled(pixels, ICONS / f"{name}.png", palette, scale=3)


def make_sigil(name: str, color: tuple[int, int, int], motif: str) -> None:
    size = 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Shield base
    d.polygon([(8, 6), (56, 6), (56, 36), (32, 58), (8, 36)], fill=(18, 20, 28, 255), outline=(*color, 255))
    d.polygon([(12, 10), (52, 10), (52, 34), (32, 52), (12, 34)], fill=(28, 32, 42, 255))
    cx, cy = 32, 28
    c = (*color, 255)
    if motif == "flame":
        d.polygon([(cx, 10), (cx + 10, 28), (cx + 4, 28), (cx + 12, 44), (cx, 50), (cx - 12, 44), (cx - 4, 28), (cx - 10, 28)], fill=c)
    elif motif == "blades":
        d.rectangle((cx - 2, 12, cx + 2, 48), fill=c)
        d.polygon([(cx - 14, 20), (cx - 2, 28), (cx - 14, 36)], fill=c)
        d.polygon([(cx + 14, 20), (cx + 2, 28), (cx + 14, 36)], fill=c)
    elif motif == "moon":
        d.ellipse((18, 14, 46, 42), fill=c)
        d.ellipse((26, 14, 50, 40), fill=(28, 32, 42, 255))
    elif motif == "crown":
        d.polygon([(14, 40), (14, 24), (22, 32), (28, 14), (32, 28), (36, 14), (42, 32), (50, 24), (50, 40)], fill=c)
    elif motif == "dragon":
        d.polygon([(12, 40), (22, 18), (30, 28), (44, 12), (40, 28), (52, 24), (40, 36), (48, 48), (32, 40), (22, 50)], fill=c)
    else:  # orb
        d.ellipse((18, 16, 46, 44), fill=c)
        d.ellipse((24, 20, 34, 30), fill=(255, 255, 255, 90))
    img = img.resize((96, 96), Image.NEAREST)
    SIGILS.mkdir(parents=True, exist_ok=True)
    img.save(SIGILS / f"{name}.png")


def make_banner(name: str, color: tuple[int, int, int], motif: str) -> None:
    w, h = 48, 120
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    body = [(4, 0), (44, 0), (44, 96), (24, 116), (4, 96)]
    d.polygon(body, fill=(20, 22, 30, 255), outline=(*color, 255))
    d.rectangle((4, 0, 44, 10), fill=color)
    # Inner wash
    d.polygon([(8, 14), (40, 14), (40, 90), (24, 106), (8, 90)], fill=(color[0] // 3, color[1] // 3, color[2] // 3, 220))
    # Motif block
    cx, cy = 24, 48
    c = (*color, 255)
    if motif == "flame":
        d.polygon([(cx, 28), (cx + 8, 44), (cx + 3, 44), (cx + 10, 58), (cx, 64), (cx - 10, 58), (cx - 3, 44), (cx - 8, 44)], fill=c)
    elif motif == "blades":
        d.rectangle((cx - 2, 30, cx + 2, 66), fill=c)
        d.polygon([(cx - 12, 38), (cx - 2, 46), (cx - 12, 54)], fill=c)
        d.polygon([(cx + 12, 38), (cx + 2, 46), (cx + 12, 54)], fill=c)
    elif motif == "moon":
        d.ellipse((12, 36, 36, 60), fill=c)
        d.ellipse((18, 36, 40, 58), fill=(20, 22, 30, 255))
    elif motif == "crown":
        d.polygon([(10, 58), (10, 42), (16, 50), (20, 34), (24, 48), (28, 34), (32, 50), (38, 42), (38, 58)], fill=c)
    elif motif == "dragon":
        d.polygon([(8, 58), (16, 38), (22, 46), (34, 32), (30, 46), (40, 42), (30, 52), (36, 64), (24, 56), (16, 66)], fill=c)
    else:
        d.ellipse((12, 38, 36, 62), fill=c)
    out = img.resize((w * 3, h * 3), Image.NEAREST)
    BANNERS.mkdir(parents=True, exist_ok=True)
    out.save(BANNERS / f"{name}.png")


def main() -> None:
    gold = {
        "Y": (220, 170, 60, 255),
        "D": (140, 100, 30, 255),
        "W": (245, 220, 140, 255),
        "B": (20, 22, 28, 255),
    }
    make_icon(
        "gold",
        [
            "....YYYY....",
            "...YWWWYY...",
            "..YWYYYYDY..",
            ".YWYYYYYYDY.",
            ".YWYYDDYYDY.",
            ".YWYYYYYYDY.",
            "..YWYYYYDY..",
            "...YDDDYY...",
            "....YYYY....",
            "............",
            "............",
            "............",
        ],
        gold,
    )

    gem = {
        "P": (170, 80, 210, 255),
        "L": (220, 160, 255, 255),
        "D": (90, 40, 120, 255),
    }
    make_icon(
        "influence",
        [
            "......P.....",
            ".....PLP....",
            "....PLLLP...",
            "...PLLLLDP..",
            "..PLLLLLDDP.",
            ".PLLLLLLDDDP",
            "..PDDDDDDP..",
            "...PDDDDP...",
            "....PDDP....",
            ".....PP.....",
            "............",
            "............",
        ],
        gem,
    )

    steel = {
        "S": (200, 205, 210, 255),
        "D": (90, 95, 105, 255),
        "G": (180, 150, 70, 255),
    }
    make_icon(
        "military",
        [
            ".....SS.....",
            ".....SS.....",
            ".....SS.....",
            ".....SS.....",
            "....SSSS....",
            "GGGGSSSSGGGG",
            "....SSSS....",
            ".....SS.....",
            ".....DD.....",
            ".....DD.....",
            "....DDDD....",
            "............",
        ],
        steel,
    )

    crest = {
        "G": (230, 190, 80, 255),
        "R": (150, 40, 50, 255),
        "D": (60, 50, 30, 255),
    }
    make_icon(
        "reputation",
        [
            "..DDDDDDDD..",
            ".DGGGGGGGGD.",
            ".DGGRRRRGGD.",
            ".DGRRRRRRGD.",
            ".DGRRRRRRGD.",
            ".DGGRRRRGGD.",
            ".DGGGGGGGGD.",
            "..DGGGGGGD..",
            "...DGGGGD...",
            "....DGGD....",
            ".....DD.....",
            "............",
        ],
        crest,
    )

    castle = {
        "S": (190, 185, 175, 255),
        "D": (70, 75, 85, 255),
        "W": (240, 200, 90, 255),
    }
    make_icon(
        "territory",
        [
            ".S..S..S..S.",
            ".S..S..S..S.",
            "SSSSSSSSSSSS",
            "S.WW.SS.WW.S",
            "S....SS....S",
            "S.WW.SS.WW.S",
            "S....SS....S",
            "SSSSSSSSSSSS",
            "S..........S",
            "S....DD....S",
            "SSSSSSSSSSSS",
            "............",
        ],
        castle,
    )

    dragon = {
        "T": (20, 160, 155, 255),
        "D": (10, 80, 85, 255),
        "E": (240, 200, 80, 255),
    }
    make_icon(
        "dragon",
        [
            ".......T....",
            "......TTT...",
            "..T..TTTTT..",
            ".TTTTTT.T.T.",
            "TTTTTT..E...",
            ".TTTTTT.....",
            "..TTTTTT....",
            "...TT.TTT...",
            "....T..TT...",
            ".....T.DD...",
            "............",
            "............",
        ],
        dragon,
    )

    for action, color in [
        ("attack", (200, 70, 50)),
        ("fortify", (90, 140, 70)),
        ("dragonstrike", (20, 160, 155)),
        ("diplomacy", (70, 120, 190)),
        ("sabotage", (140, 60, 160)),
        ("tax", (220, 170, 60)),
    ]:
        img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rectangle((1, 1, 14, 14), fill=(18, 20, 28, 255), outline=(*color, 255))
        d.rectangle((4, 4, 11, 11), fill=(*color, 255))
        img = img.resize((48, 48), Image.NEAREST)
        ICONS.mkdir(parents=True, exist_ok=True)
        img.save(ICONS / f"{action}.png")

    houses = [
        ("ashen", (217, 74, 47), "flame"),
        ("iron", (155, 162, 170), "blades"),
        ("gloam", (122, 170, 59), "moon"),
        ("ember", (212, 155, 50), "crown"),
        ("sky", (23, 166, 162), "dragon"),
        ("dusk", (123, 69, 170), "orb"),
    ]
    for name, color, motif in houses:
        make_sigil(name, color, motif)
        make_banner(name, color, motif)

    print(f"Wrote icons to {ICONS}")
    print(f"Wrote sigils to {SIGILS}")
    print(f"Wrote banners to {BANNERS}")


if __name__ == "__main__":
    main()
