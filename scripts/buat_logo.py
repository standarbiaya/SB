"""Membuat logo Standar Biaya (emblem 5 kelopak + bintang) sebagai SVG vektor.

Jalankan:  python3 scripts/buat_logo.py  -> menulis public/icons/portal-logo.svg dan favicon.svg
"""
import math,re,sys
C='#440CAA'
def pol(r,deg):
    a=math.radians(deg-90); return (r*math.cos(a), r*math.sin(a))
def f(p): return f"{p[0]:.2f} {p[1]:.2f}"
def heart(w=41,r_tip=10,r_side=56,r_cleft=71,r_top=86):
    # lokal: arah luar = -y, ujung hati di dekat pusat
    return (f"M0 {-r_tip} C {-w*0.45} {-r_tip-10} {-w} {-r_side+10} {-w} {-r_side-12} "
            f"C {-w} {-r_top+2} {-w*0.3} {-r_top-3} 0 {-r_cleft} "
            f"C {w*0.3} {-r_top-3} {w} {-r_top+2} {w} {-r_side-12} "
            f"C {w} {-r_side+10} {w*0.45} {-r_tip-10} 0 {-r_tip} Z")
def star(R=42,r=19):
    return "M"+" L".join(f(pol(R if i%2==0 else r,36*i)) for i in range(10))+" Z"
def emblem(color=C,bg='#fff',sw=10,inner=6):
    h=re.sub(r'-?\d+\.\d+',lambda m:('%.2f'%float(m.group())).rstrip('0').rstrip('.'),heart())
    rot=lambda i:f'transform="rotate({72*i})"'
    ring=''.join(f'<path d="{h}" {rot(i)}/>' for i in range(5))
    lines=[]
    R,r=42,19
    lerp=lambda a,b,t:(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)
    for i in range(5):
        tip=pol(R,72*i); cleft=pol(70,72*i)
        for side in (-1,1):
            v=pol(r,72*i+36*side)
            # huruf V: dari lekuk kelopak ke sisi ujung bintang
            lines.append(f'M{f(cleft)} L{f(lerp(tip,v,0.42))}')
        # pemisah kelopak: dari lembah antar-hati ke titik dalam bintang
        lines.append(f'M{f(pol(66,72*i+36))} L{f(pol(r+6,72*i+36))}')
    return (f'<g transform="translate(100 100)" stroke-linejoin="round" stroke-linecap="round">'
            f'<g fill="none" stroke="{color}" stroke-width="{sw*2}">{ring}</g>'
            f'<g fill="{bg}">{ring}</g>'
            f'<path d="{" ".join(lines)}" fill="none" stroke="{color}" stroke-width="{inner}"/>'
            f'<path d="{star()}" fill="{bg}" stroke="{color}" stroke-width="{inner+1}"/></g>')
def svg(size=None,color=C,bg='#fff',label='Logo Standar Biaya'):
    wh=f' width="{size}" height="{size}"' if size else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"{wh} role="img" aria-label="{label}">{emblem(color,bg)}</svg>\n'
if __name__=='__main__':
    from pathlib import Path
    icons=Path(__file__).resolve().parent.parent/'public/icons'
    def save(name,sw,inner,label):
        (icons/name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="{label}">{emblem(C,"#fff",sw,inner)}</svg>\n')
    save('portal-logo.svg',10,6,'Logo Standar Biaya')
    save('favicon.svg',13,9,'Standar Biaya')
