"""Dump every Storyboard / VisualTransition / theme animation / transition in generic.xaml,
grouped by top-level Style, with the enclosing VisualStateGroup/VisualState and line numbers."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xamltree import parse, walk

ANIM_SUFFIX = ('Animation', 'AnimationUsingKeyFrames', 'KeyFrame', 'Ease', 'Transition',
               'TransitionInfo', 'ThemeAnimation')

def ctx(n):
    parts = []
    p = n.parent
    while p is not None and p.tag != 'Style':
        if p.tag in ('VisualState', 'VisualStateGroup'):
            parts.append(f"{p.tag[6:] or 'State'}:{p.attrs.get('x:Name','')}")
        elif p.tag == 'VisualTransition':
            a = p.attrs
            parts.append('Transition(' + ','.join(f"{k}={v}" for k, v in a.items()) + ')')
        p = p.parent
    return ' / '.join(reversed(parts))

def fmt(n):
    a = ' '.join(f'{k}="{v}"' for k, v in n.attrs.items())
    return f"{n.line}: <{n.tag} {a}>"

root = parse(sys.argv[1])
top = root.children[0]
for s in top.children:
    if s.tag != 'Style':
        continue
    rows = []
    for n in walk(s):
        if n.tag == 'VisualTransition' or n.tag.endswith(ANIM_SUFFIX) or n.tag.endswith('.EasingFunction') or n.tag in ('Storyboard',) or 'Transitions' in n.tag:
            if n.tag == 'Storyboard' and not n.attrs:
                continue
            depth = 0
            rows.append((n, ctx(n)))
    if not rows:
        continue
    print(f"\n=== {s.attrs.get('TargetType')} {s.attrs.get('x:Key','')} (lines {s.line}-{s.end}) ===")
    last = None
    for n, c in rows:
        if c != last:
            print(f"  [{c}]")
            last = c
        print('    ' + fmt(n))
