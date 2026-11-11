"""渲染 Preview/assembled.png、exploded.png、dimensions.png（matplotlib，无需 GPU）。

用法：python tools/render.py [B|A]
海胆壳、蜡烛灯、纸触手只是示意模型，不参与打印。
"""
import math
import subprocess
import sys
import tempfile
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import trimesh  # noqa: E402
from matplotlib.colors import to_rgb  # noqa: E402
from mpl_toolkits.mplot3d.art3d import Poly3DCollection  # noqa: E402

plt.rcParams["font.sans-serif"] = ["PingFang SC", "Heiti SC", "Arial Unicode MS", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

ROOT = Path(__file__).resolve().parent.parent
SCAD = ROOT / "Iris_Jellyfish_V6.scad"
PREVIEW = ROOT / "Preview"
SUFFIX = ""

STYLE = {
    "base":   ("#9fd8ea", 0.55, "Base 透明底座 (PETG)"),
    "pole":   ("#7cc6de", 0.70, "Center_Pole 支撑柱 (PETG)"),
    "holder": ("#f2eef8", 1.00, "LED_Holder 灯座 (白 PLA)"),
    "candle": ("#ffe7a3", 1.00, "KC018 蜡烛灯（已有）"),
    "ring":   ("#b48ad0", 1.00, "Shell_Tentacle_Ring 托圈 (浅紫 PLA)"),
    "shell":  ("#d99cc0", 0.92, "海胆壳 Ø70（实物）"),
}


def export(part, mode, tmp, fn=72):
    out = Path(tmp) / f"{part}.stl"
    res = subprocess.run(["openscad", "--backend=manifold", "--export-format", "binstl", "-o", str(out),
                          "-D", f'part="{part}"', "-D", f'mode="{mode}"', "-D", f"$fn={fn}", str(SCAD)],
                         capture_output=True, text=True, check=True)
    pos = slot = None
    for line in res.stderr.splitlines():
        if "[V6POS]" in line:
            pos = [float(v) for v in line.split("[V6POS]")[1].strip('"').split(",")]
        if "[V6SLOT]" in line:
            slot = [float(v) for v in line.split("[V6SLOT]")[1].strip('"').split(",")]
    return trimesh.load(out, force="mesh"), pos, slot


def load_all(mode):
    with tempfile.TemporaryDirectory() as tmp:
        meshes, pos, slot = {}, None, None
        for p in ["base", "pole", "holder", "candle", "ring", "shell"]:
            m, ps, sl = export(p, mode, tmp)
            meshes[p] = m
            pos, slot = ps or pos, sl or slot
    pole_z0, holder_z0, ring_z0, led_z0, shell_bottom_z, contact_z, pole_len = pos
    z = {"base": 0, "pole": pole_z0, "holder": holder_z0, "candle": led_z0, "ring": ring_z0}
    for k, v in z.items():
        meshes[k].apply_translation([0, 0, v])
    # 海胆壳：按示意模型实际落到托圈的位置摆放
    s = meshes["shell"]
    lo, hi = contact_z - 25, contact_z + 5
    for _ in range(26):
        mid = (lo + hi) / 2
        t = s.copy()
        t.apply_translation([0, 0, mid - t.bounds[0][2]])
        i = trimesh.boolean.intersection([t, meshes["ring"]], engine="manifold")
        if not i.is_empty and i.volume > 1e-4:
            lo = mid
        else:
            hi = mid
    s.apply_translation([0, 0, hi - s.bounds[0][2]])
    return meshes, dict(pole_z0=pole_z0, holder_z0=holder_z0, ring_z0=ring_z0, led_z0=led_z0,
                        shell_bottom_z=hi, contact_z=contact_z, pole_len=pole_len, slot=slot)


def tentacles(info, n=12):
    """纸触手示意：从每个孔向下飘的波浪带。"""
    r0, z0 = info["slot"][0], info["ring_z0"] + info["slot"][1]
    lines = []
    cols = ["#a99be8", "#f0a9d2", "#89cfe3"]
    for i in range(n):
        a = math.radians(i * 360 / n + 15)
        t = np.linspace(0, 1, 40)
        zz = z0 - 2 - t * (z0 - 2 - 22)
        rr = r0 + 1 + 4 * t + 2.2 * np.sin(t * 7 + i)
        aa = a + 0.10 * np.sin(t * 5 + i * 0.7)
        lines.append((rr * np.cos(aa), rr * np.sin(aa), zz, cols[i % 3]))
    return lines


def shade(mesh, color, alpha, light=(-0.45, -0.75, 0.6)):
    L = np.array(light) / np.linalg.norm(light)
    n = mesh.face_normals
    k = 0.38 + 0.62 * np.clip(n @ L, 0, 1)
    c = np.array(to_rgb(color))
    rgb = np.clip(c[None, :] * k[:, None] + 0.10 * (1 - k[:, None]), 0, 1)
    return np.hstack([rgb, np.full((len(rgb), 1), alpha)])


def draw(ax, meshes, offsets=None, cut=False, show_tentacles=None):
    polys, cols = [], []
    for k, m in meshes.items():
        m = m.copy()
        if offsets:
            m.apply_translation([0, 0, offsets.get(k, 0)])
        if cut:  # 剖去前方 1/4，便于看到内部
            m = m.slice_plane([0, 0, 0], [0, 1, 0], cap=True) if k != "shell" else m.slice_plane([0, 0, 0], [0, 1, 0])
        color, alpha, _ = STYLE[k]
        polys.append(m.triangles)
        cols.append(shade(m, color, alpha))
    pc = Poly3DCollection(np.vstack(polys), facecolors=np.vstack(cols), linewidths=0)
    ax.add_collection3d(pc)
    if show_tentacles:
        for x, y, z, c in show_tentacles:
            ax.plot(x, y, z, color=c, lw=3.2, alpha=0.9, solid_capstyle="round")


def frame(ax, zmax, title, elev=14, azim=-62):
    ax.set_xlim(-48, 48)
    ax.set_ylim(-48, 48)
    ax.set_zlim(0, zmax)
    ax.set_box_aspect((96, 96, zmax))
    ax.view_init(elev=elev, azim=azim)
    ax.set_axis_off()
    ax.set_title(title, fontsize=13, color="#4a3d5c", pad=0)


def legend(fig, keys):
    from matplotlib.patches import Patch
    handles = [Patch(facecolor=STYLE[k][0], edgecolor="#8a7d99", label=STYLE[k][2]) for k in keys]
    fig.legend(handles=handles, loc="lower center", ncol=3, frameon=False, fontsize=9)


def render_assembled(meshes, info, mode):
    fig = plt.figure(figsize=(12, 8.2), dpi=150, facecolor="#f7f4fb")
    zmax = meshes["shell"].bounds[1][2] + 4
    ax1 = fig.add_subplot(1, 2, 1, projection="3d", facecolor="#f7f4fb")
    draw(ax1, meshes, show_tentacles=tentacles(info))
    frame(ax1, zmax, f"完整装配（模式 {mode}，含纸触手示意）")
    ax2 = fig.add_subplot(1, 2, 2, projection="3d", facecolor="#f7f4fb")
    draw(ax2, meshes, cut=True)
    frame(ax2, zmax, "剖视：灯头靠近海胆壳底部开口", azim=-90, elev=8)
    legend(fig, list(STYLE))
    fig.subplots_adjust(left=0, right=1, top=0.95, bottom=0.08, wspace=0)
    fig.savefig(PREVIEW / f"assembled{SUFFIX}.png", facecolor=fig.get_facecolor())
    plt.close(fig)


def render_exploded(meshes, info, mode):
    gap = 26
    offsets = {"base": 0, "pole": gap, "holder": 2 * gap, "candle": 3 * gap, "ring": 3.6 * gap, "shell": 4.6 * gap}
    fig = plt.figure(figsize=(8, 11), dpi=150, facecolor="#f7f4fb")
    ax = fig.add_subplot(1, 1, 1, projection="3d", facecolor="#f7f4fb")
    draw(ax, meshes, offsets=offsets)
    zmax = meshes["shell"].bounds[1][2] + offsets["shell"] + 4
    frame(ax, zmax, f"分解图（模式 {mode}）：从下往上依次插入", elev=10)
    # 装配轴线
    ax.plot([0, 0], [0, 0], [20, zmax - 10], color="#9b8fb0", lw=0.8, ls="--")
    labels = [("base", 10, "① Base 底座"), ("pole", None, "② Center_Pole 插入底座"),
              ("holder", None, "③ LED_Holder 插到柱顶"), ("candle", None, "④ KC018 灯头朝上放入"),
              ("ring", None, "⑤ 托圈套在灯座定位环上"), ("shell", None, "⑥ 海胆壳轻放在托圈上")]
    for k, zfix, text in labels:
        m = meshes[k]
        zc = zfix if zfix is not None else (m.bounds[0][2] + m.bounds[1][2]) / 2 + offsets[k]
        ax.text(46, 0, zc, text, fontsize=10, color="#4a3d5c")
    legend(fig, list(STYLE))
    fig.subplots_adjust(left=0, right=1, top=0.97, bottom=0.05)
    fig.savefig(PREVIEW / f"exploded{SUFFIX}.png", facecolor=fig.get_facecolor())
    plt.close(fig)


def section_polys(mesh):
    s = mesh.section(plane_origin=[0, 0, 0], plane_normal=[0, 1, 0])
    if s is None:
        return []
    p2, T = s.to_2D(to_2D=[[1, 0, 0, 0], [0, 0, 1, 0], [0, 1, 0, 0], [0, 0, 0, 1]])
    return [np.array(poly.exterior.coords) for poly in p2.polygons_full], [
        [np.array(i.coords) for i in poly.interiors] for poly in p2.polygons_full]


def dim(ax, p1, p2, text, off=(0, 0), color="#3b2f4f", vertical=False):
    ax.annotate("", xy=p1, xytext=p2, arrowprops=dict(arrowstyle="<->", color=color, lw=0.9))
    mx, my = (p1[0] + p2[0]) / 2 + off[0], (p1[1] + p2[1]) / 2 + off[1]
    ax.text(mx, my, text, fontsize=8.5, color=color, ha="center", va="center",
            rotation=90 if vertical else 0,
            bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none", alpha=0.85))


def render_dimensions(meshes, info, mode):
    from matplotlib.patches import PathPatch
    from matplotlib.path import Path as MPath

    fig, ax = plt.subplots(figsize=(11, 11), dpi=150, facecolor="white")
    for k in ["base", "pole", "holder", "candle", "ring", "shell"]:
        res = section_polys(meshes[k])
        if not res:
            continue
        exts, ints = res
        color, alpha, _ = STYLE[k]
        for e, holes in zip(exts, ints):
            verts = [e] + holes
            codes = []
            for v in verts:
                c = [MPath.LINETO] * len(v)
                c[0] = MPath.MOVETO
                codes += c
            path = MPath(np.vstack(verts), codes)
            ax.add_patch(PathPatch(path, facecolor=color, edgecolor="#5c4d70", lw=0.5,
                                   alpha=min(1, alpha + 0.2)))
    sb = info["shell_bottom_z"]
    top = meshes["shell"].bounds[1][2]
    hz, rz, lz, cz = info["holder_z0"], info["ring_z0"], info["led_z0"], info["contact_z"]
    # 尺寸标注
    dim(ax, (-43, -6), (43, -6), "底座 Ø86")
    dim(ax, (-52, 0), (-52, 20), "20", vertical=True)
    dim(ax, (-52, 20), (-52, sb), f"触手展示空间 {sb - 20:.1f}\n(底座顶→壳底)", off=(-6, 0), vertical=True)
    dim(ax, (-64, 0), (-64, top), f"整灯高 ≈{top:.0f}", vertical=True)
    dim(ax, (-35, top + 4), (35, top + 4), "海胆壳 Ø70（实物）")
    dim(ax, (-31, cz + 3), (31, cz + 3), "托圈外径 Ø62", off=(0, 0))
    dim(ax, (-6, 21.5), (6, 21.5), "Ø12", off=(0, 0))
    dim(ax, (14, 20), (14, hz), f"柱外露≈{hz - 20:.1f}", off=(9, 0), vertical=True)
    dim(ax, (-18.6, lz + 18), (18.6, lz + 18), "KC018 Ø37.2", off=(0, 0))
    dim(ax, (26, lz), (26, lz + 36.6), "36.6", off=(3, 0), vertical=True)
    gap = sb - lz - 36.6
    label = f"灯顶→壳底\n{gap:.1f}" if gap >= 0 else f"灯头伸入壳内\n{-gap:.1f}"
    dim(ax, (40, lz + 36.6), (40, sb), label, off=(9, 0), vertical=True)
    ax.axhline(cz, color="#b48ad0", lw=0.6, ls=":")
    ax.text(44, cz + 1, f"托圈接触面 z={cz:.1f}", fontsize=8, color="#7a5a99")
    for zline, t in [(hz, "灯座底 z={:.1f}"), (lz, "灯杯底 z={:.1f}"), (rz, "托圈底 z={:.1f}")]:
        ax.plot([24, 50], [zline, zline], color="#c9bfd6", lw=0.5)
        ax.text(51, zline, t.format(zline), fontsize=7.5, color="#6b5f7a", va="center")
    ax.set_aspect("equal")
    ax.set_xlim(-80, 80)
    ax.set_ylim(-14, top + 12)
    ax.set_axis_off()
    ax.set_title(f"Iris Jellyfish Lamp V6 · 中心剖面尺寸图（模式 {mode}，单位 mm）\n"
                 f"支撑柱本体 {info['pole_len']:.1f} mm 由 tentacle_space 反算；海胆壳/灯为示意，需实测",
                 fontsize=11, color="#3b2f4f")
    fig.tight_layout()
    fig.savefig(PREVIEW / f"dimensions{SUFFIX}.png")
    plt.close(fig)


def main():
    global SUFFIX
    mode = sys.argv[1] if len(sys.argv) > 1 else "B"
    SUFFIX = "" if mode == "B" else "_modeA"
    PREVIEW.mkdir(exist_ok=True)
    meshes, info = load_all(mode)
    render_assembled(meshes, info, mode)
    render_exploded(meshes, info, mode)
    render_dimensions(meshes, info, mode)
    print("rendered", mode, info)


if __name__ == "__main__":
    main()
