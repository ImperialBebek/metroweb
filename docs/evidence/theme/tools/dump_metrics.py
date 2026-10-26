"""Per-Style metrics: Setters and template elements carrying layout/type attributes (VisualStateManager excluded).
Usage: dump_metrics.py generic.xaml [StyleTargetFilterRegex]"""
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xamltree import parse, walk

KEYS = ('Margin','Padding','Width','Height','MinHeight','MinWidth','MaxHeight','MaxWidth','FontSize','FontFamily',
        'FontWeight','BorderThickness','StrokeThickness','CharacterSpacing','LineHeight','Opacity','RadiusX','RadiusY',
        'CornerRadius','Rect','X','Y','TranslateX','TranslateY','Background','Foreground','BorderBrush','Fill','Stroke',
        'Style','Data','HorizontalAlignment','VerticalAlignment','RenderTransformOrigin','Text')

def skip(n):
    p = n
    while p is not None:
        if p.tag.startswith('VisualStateManager'):
            return True
        p = p.parent
    return False

root = parse(sys.argv[1])
flt = re.compile(sys.argv[2]) if len(sys.argv) > 2 else None
for s in root.children[0].children:
    if s.tag != 'Style':
        continue
    name = f"{s.attrs.get('TargetType')} {s.attrs.get('x:Key','')}".strip()
    if flt and not flt.search(name):
        continue
    print(f"\n=== {name} (lines {s.line}-{s.end}) BasedOn={s.attrs.get('BasedOn','')}")
    for n in s.children:
        if n.tag == 'Setter' and 'Value' in n.attrs:
            print(f"  {n.line}: Setter {n.attrs['Property']} = {n.attrs['Value']}")
    for n in walk(s):
        if n is s or n.tag == 'Setter' or skip(n):
            continue
        a = {k: v for k, v in n.attrs.items() if k in KEYS or k == 'x:Name'}
        if any(k in KEYS for k in a):
            print(f"  {n.line}: <{n.tag} " + ' '.join(f'{k}="{v}"' for k, v in a.items()) + '>')
