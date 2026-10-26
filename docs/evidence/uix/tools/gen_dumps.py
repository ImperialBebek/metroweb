"""Regenerate the WP8.1 UIX dumps in ../uix/ using the same file names as the WP8.0 private
dumps (metroweb/docs/evidence/private/uix/), plus *_named.tsv files with resolved names.

usage: gen_dumps.py <extracted-81/resources> <out dir>
"""
import os, sys, glob, subprocess, io, contextlib
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import uib, named

res, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
rc = lambda m: os.path.join(res, m, '.rsrc', 'RCDATA')
dtp = lambda m: os.path.join(rc(m), '_DATATABLE.UIB')

def w(name, text):
    open(os.path.join(out, name), 'w').write(text)

def consts_dump(m):
    # same algorithm/format as the 8.0 consts.py dumps (tools/consts.py)
    r = subprocess.run([sys.executable, os.path.join(HERE, 'consts.py'), dtp(m)], capture_output=True, text=True)
    if r.returncode == 0: return r.stdout
    s = io.StringIO()
    s.write('no constants table in %s (8.1 asset data tables carry no constants).\n' % os.path.relpath(dtp(m), res))
    s.write('Values below come from the compact class table(s) in Constants.uix (uib.py compact):\n')
    with contextlib.redirect_stdout(s):
        for f in sorted(glob.glob(os.path.join(rc(m), '*.UIX'))):
            for vname, rows in uib.compact_class(open(f, 'rb').read()) or []:
                for k, (nm, tn, v, o) in enumerate(rows):
                    print('%s\t%s\t%d\t@%x\t%s\t%s\t%s' % (os.path.basename(f), vname, k, o, nm, tn, v))
    return s.getvalue()

for m, fn in [('ShellControls', 'ShellControls_consts.txt'), ('ShellControlsAssets480x800', 'ShellControlsAssets480x800_consts.txt'),
              ('StartAssets480x800', 'StartAssets480x800_consts.txt'), ('UIXMobileAssets480x800', 'UIXMobileAssets480x800_consts.txt'),
              ('uixmobile', 'uixmobile_consts.txt')]:
    w(fn, consts_dump(m))

for m, fn in [('ShellControls', 'shell_strings.txt'), ('uixmobile', 'uix_strings.txt'),
              ('UIXMobileAssets480x800', 'uixassets_strings.txt'), ('ShellControlsAssets480x800', 'scassets_strings.txt')]:
    dt = uib.DataTable(dtp(m))
    w(fn, '\n'.join('%d\t%r' % (k, s) for k, s in enumerate(dt.strings)))

dt = uib.DataTable(dtp('ShellControls'))
w('shell_props.txt', '\n'.join('%x\t%x\t%s' % (k, t, s) for k, (t, s) in enumerate(dt.props)))

buf = io.StringIO()
for f in sorted(glob.glob(os.path.join(rc('ShellControls'), '*.UIX'))):
    blocks = uib.anim_blocks(open(f, 'rb').read(), dt)
    if not blocks: continue
    buf.write('===== %s\n' % os.path.splitext(os.path.basename(f))[0])
    for at, end, lines in blocks:
        buf.write('@%x-%x\n%s\n' % (at, end, '\n'.join(lines)))
w('anims_shell.txt', buf.getvalue())

for m in ['ShellControls', 'ShellControlsAssets480x800', 'StartAssets480x800', 'UIXMobileAssets480x800', 'uixmobile',
          'ShellChrome', 'ShellChromeAssets480x800', 'NocenterCm', 'NocenterAssets480x800', 'startmenu', 'PhoneShellUI']:
    w('%s_named.tsv' % m, ''.join('\t'.join(r) + '\n' for r in named.rows(os.path.join(res, m))))
