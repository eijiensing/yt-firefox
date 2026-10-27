#!/usr/bin/env python3
"""Generate simple cookie-style PNG icons for the extension.

Usage:  python3 scripts/make-icons.py
Output: icons/icon-{16,32,48,96}.png  (plain, no dependencies)
"""
import os
import struct
import zlib

SIZES = [16, 32, 48, 96]

# Palette (flat colors, no antialiasing)
BG = (32, 33, 36)       # dark charcoal
COOKIE = (242, 180, 85)  # tan
CHIP = (165, 107, 31)    # darker chocolate chips
RIM = (255, 255, 255)    # white rim


def write_png(path, size, pixel_fn):
    rows = []
    for y in range(size):
        row = bytearray(b"\x00")  # filter type 0
        for x in range(size):
            row += bytes(pixel_fn(x, y, size))
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def cookie_icon(x, y, size):
    c = (size - 1) / 2.0
    r = size * 0.62
    dx, dy = x - c, y - c
    dist = (dx * dx + dy * dy) ** 0.5

    if dist > r:
        return BG
    if dist > r - size * 0.10:
        return RIM

    # Chocolate chips: fixed positions, small circles
    chips = [(0.5, 0.0), (-0.35, 0.4), (0.1, -0.45), (-0.6, -0.25)]
    chip_r = size * 0.09
    for cx, cy in chips:
        ddx, ddy = x - (c + cx * r * 0.75), y - (c + cy * r * 0.75)
        if (ddx * ddx + ddy * ddy) ** 0.5 < chip_r:
            return CHIP
    return COOKIE


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out_dir, exist_ok=True)
    for size in SIZES:
        path = os.path.join(out_dir, f"icon-{size}.png")
        write_png(path, size, cookie_icon)
        print(f"wrote {os.path.abspath(path)}")


if __name__ == "__main__":
    main()
