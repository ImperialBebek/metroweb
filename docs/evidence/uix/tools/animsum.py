"""Summarise uib.py 'anims' output: one line per animation, keyframes as Kind[time=value interp]."""
import sys, re

def blocks(path):
    cur = None
    for line in open(path):
        line = line.rstrip('\n')
        if line.startswith('=====') : continue
        if line.startswith('@'):
            if cur: yield cur
            cur = {'at': line, 'lines': []}; continue
        if cur is not None: cur['lines'].append(line)
    if cur: yield cur

def summarise(b):
    head = {}; kfs = []; kf = None; depth0 = None
    for l in b['lines']:
        s = l.strip(); ind = len(l) - len(l.lstrip())
        if s.startswith('new '):
            t = s[4:]
            if t.endswith('Keyframe'): kf = {'k': t.replace('Keyframe', '')}; kfs.append(kf)
            elif depth0 is None: depth0 = ind; head['type'] = t
            continue
        if s.startswith('->'): kf = None; continue
        m = re.match(r'\.(\w+) = (.*)', s)
        if not m: continue
        k, v = m.groups()
        if kf is not None: kf[k] = v
        else: head[k] = v
    name = head.get('Name', '?').replace("String('", '').rstrip("')")
    parts = []
    for kf in kfs:
        p = '%s[t=%s v=%s' % (kf['k'], kf.get('Time', '?'), kf.get('Value', '?'))
        if 'Interpolation' in kf: p += ' ' + kf['Interpolation'].replace('Interpolation(', 'I(').replace('weight=', 'w=')
        if 'RelativeTo' in kf: p += ' rel=' + kf['RelativeTo']
        parts.append(p + ']')
    extra = ' '.join('%s=%s' % (k, v) for k, v in head.items() if k not in ('Name',))
    return '%s {%s} %s' % (name, extra, ' '.join(parts))

if __name__ == '__main__':
    pat = re.compile(sys.argv[2]) if len(sys.argv) > 2 else None
    for b in blocks(sys.argv[1]):
        s = summarise(b)
        if pat is None or pat.search(s): print(s)
