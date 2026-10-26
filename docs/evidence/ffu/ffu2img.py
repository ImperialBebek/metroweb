#!/usr/bin/env python3
"""Convert a Windows Phone 8.x FFU (Full Flash Update) image into a raw disk image.

Usage: ffu2img.py <image.ffu> <out.img> [--info]

FFU v1 layout: SecurityHeader (+catalog, hash table) | ImageHeader (+manifest) |
StoreHeader (+validate and write descriptors) | data blocks. Each section is padded
to the chunk size. Blocks are written in descriptor order; locations with access
method 0 count from the start of the disk, 2 from the end. The output is sparse.
"""
import struct, sys, os

def pad(off, chunk):
    return (off + chunk - 1) // chunk * chunk

def main():
    src, dst = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None
    info_only = '--info' in sys.argv
    f = open(src, 'rb')
    size = os.fstat(f.fileno()).st_size
    cb, sig, chunk_kb, alg, cat, ht = struct.unpack('<I12sIIII', f.read(32))
    assert sig == b'SignedImage ', sig
    chunk = chunk_kb * 1024
    off = pad(cb + cat + ht, chunk)
    f.seek(off)
    cb2, sig2, man_len, chunk2 = struct.unpack('<I12sII', f.read(24))
    assert sig2 == b'ImageFlash  ', sig2
    manifest = f.read(man_len).decode('ascii', 'replace')
    off = pad(off + cb2 + man_len, chunk)
    f.seek(off)
    hdr = f.read(248)
    (upd, maj, mnr, ffmaj, ffmnr) = struct.unpack_from('<IHHHH', hdr, 0)
    platform = hdr[12:204].split(b'\0')[0].decode()
    (block, wcount, wlen, vcount, vlen) = struct.unpack_from('<5I', hdr, 204)
    print(f'chunk {chunk} B, store v{maj}.{mnr}, platform {platform!r}, block {block} B, {wcount} write descriptors')
    print('--- manifest ---'); print(manifest.strip())
    f.seek(off + 248 + vlen)
    descs = f.read(wlen)
    data = pad(off + 248 + vlen + wlen, chunk)
    entries = []; p = 0
    for _ in range(wcount):
        lc, bc = struct.unpack_from('<II', descs, p); p += 8
        locs = [struct.unpack_from('<II', descs, p + 8 * i) for i in range(lc)]; p += 8 * lc
        entries.append((bc, locs))
    total = sum(bc for bc, _ in entries)
    end_block = max((l[1] + bc for bc, ls in entries for l in ls if l[0] == 0), default=0)
    need = data + total * block
    print(f'data at {data:#x}, {total} blocks = {total * block / 2**20:.1f} MiB, file {size / 2**20:.1f} MiB of {need / 2**20:.1f} needed, disk spans >= {end_block * block / 2**30:.2f} GiB')
    if info_only or not dst:
        return
    if size < need:
        sys.exit('FFU is incomplete')
    out = open(dst, 'wb'); out.truncate(end_block * block)
    f.seek(data)
    skipped = 0
    for bc, locs in entries:
        buf = f.read(bc * block)
        for method, idx in locs:
            if method == 0:
                out.seek(idx * block); out.write(buf)
            else:
                skipped += bc  # end-relative (backup GPT); disk size unknown, so skip
    out.close()
    print(f'wrote {dst}; skipped {skipped} end-relative blocks')

main()
