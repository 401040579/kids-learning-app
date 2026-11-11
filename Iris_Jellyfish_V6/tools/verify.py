"""Iris Jellyfish V6 几何与装配检查。

用法（需要 trimesh / manifold3d / numpy / scipy / rtree）：
    python tools/verify.py            # 检查模式 B（默认）与模式 A
输出写到 Preview/verify_report.json，并在终端打印摘要。
注意：这里只是软件几何检查，不能替代实物试装。
"""
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parent.parent
SCAD = ROOT / "Iris_Jellyfish_V6.scad"
OPENSCAD = ["openscad", "--backend=manifold", "--export-format", "binstl"]


SLOT = {}


def scad_export(part, mode, out):
    res = subprocess.run(OPENSCAD + ["-o", str(out), "-D", f'part="{part}"', "-D", f'mode="{mode}"', str(SCAD)],
                         capture_output=True, text=True, check=True)
    for line in res.stderr.splitlines():
        if "[V6SLOT]" in line:
            r, z, n = line.split("[V6SLOT]")[1].strip('"').split(",")
            SLOT[mode] = (float(r), float(z), int(float(n)))
    pos = None
    for line in res.stderr.splitlines():
        if "[V6POS]" in line:
            pos = [float(v) for v in line.split("[V6POS]")[1].strip('"').split(",")]
    return pos


def load(path):
    m = trimesh.load(path, force="mesh")
    m.merge_vertices()
    return m


def mesh_report(m):
    bodies = m.split(only_watertight=False)
    return {
        "watertight": bool(m.is_watertight),
        "winding_consistent": bool(m.is_winding_consistent),
        "is_volume": bool(m.is_volume),
        "bodies": len(bodies),
        "volume_cm3": round(m.volume / 1000, 2),
        "bbox_mm": [round(float(x), 2) for x in m.extents],
        "faces": len(m.faces),
    }


def overhang_report(m, limit_deg=47):
    """打印方向即模型方向（最低面贴床）。统计比 limit_deg 更陡的向下悬空面。"""
    zmin = m.bounds[0][2]
    n = m.face_normals
    c = m.triangles_center
    down = n[:, 2] < -math.sin(math.radians(limit_deg))
    on_bed = c[:, 2] < zmin + 0.05
    bad = down & ~on_bed
    area = float(m.area_faces[bad].sum())
    zs = sorted({round(float(z), 1) for z in c[bad][:, 2]})
    return {"steep_overhang_area_mm2": round(area, 1), "at_z": zs[:12]}


def intersect_volume(a, b):
    try:
        i = trimesh.boolean.intersection([a, b], engine="manifold")
        return round(float(i.volume), 3) if not i.is_empty else 0.0
    except Exception as e:  # noqa
        return f"error: {e}"


def min_distance(a, b, n=6000):
    pts = a.sample(n)
    pts = np.vstack([pts, a.vertices[:: max(1, len(a.vertices) // n)]])
    _, d, _ = trimesh.proximity.closest_point(b, pts)
    return round(float(d.min()), 3)


def side_gap(candle, holder):
    """蜡烛灯侧面与灯杯（含定位筋）的最小径向间隙；杯底是承托面，不计。"""
    cz0 = candle.bounds[0][2]
    pts = candle.sample(8000)
    pts = pts[(pts[:, 2] > cz0 + 0.5)]
    _, d, _ = trimesh.proximity.closest_point(holder, pts)
    return round(float(d.min()), 3)


def shell_rest_offset(shell, ring, lo, hi):
    """二分查找：海胆壳示意模型自由落到托圈上时，壳底的最低高度。"""
    for _ in range(30):
        mid = (lo + hi) / 2
        s = shell.copy()
        s.apply_translation([0, 0, mid - s.bounds[0][2]])
        v = intersect_volume(s, ring)
        if isinstance(v, float) and v > 1e-4:
            lo = mid
        else:
            hi = mid
    return hi


def check_mode(mode, tmp):
    out = {}
    paths = {}
    pos = None
    for part in ["base", "pole", "holder", "ring", "shell", "candle"]:
        p = Path(tmp) / f"{part}_{mode}.stl"
        r = scad_export(part, mode, p)
        pos = r or pos
        paths[part] = p
    pole_z0, holder_z0, ring_z0, led_z0, shell_bottom_z, contact_z, pole_len = pos
    m = {k: load(v) for k, v in paths.items()}
    slot_info = SLOT[mode]
    out["positions"] = dict(pole_z0=pole_z0, holder_z0=holder_z0, ring_z0=ring_z0, led_z0=led_z0,
                            shell_bottom_z=shell_bottom_z, contact_z=contact_z, pole_len=pole_len)

    # 1. 网格质量
    out["mesh"] = {k: mesh_report(m[k]) for k in ["base", "pole", "holder", "ring"]}
    out["overhang"] = {k: overhang_report(m[k]) for k in ["base", "pole", "holder", "ring"]}

    # 装配到世界坐标
    A = {k: v.copy() for k, v in m.items()}
    A["pole"].apply_translation([0, 0, pole_z0])
    A["holder"].apply_translation([0, 0, holder_z0])
    A["ring"].apply_translation([0, 0, ring_z0])
    A["candle"].apply_translation([0, 0, led_z0])

    # 海胆壳示意模型：按真实接触求静止位置（而不是用参数直接摆放）
    rest = shell_rest_offset(A["shell"], A["ring"], contact_z - 25, contact_z + 5)
    A["shell"].apply_translation([0, 0, rest - A["shell"].bounds[0][2]])
    out["shell_rest"] = {
        "modeled_shell_bottom_z": round(rest, 2),
        "param_shell_bottom_z": round(shell_bottom_z, 2),
        "actual_sag_mm": round(contact_z - rest, 2),
    }

    # 2–5. 干涉与间隙
    pairs = [("base", "pole"), ("pole", "holder"), ("holder", "ring"), ("holder", "candle"),
             ("ring", "candle"), ("ring", "shell"), ("candle", "shell"), ("holder", "shell"), ("base", "holder")]
    out["interference_mm3"] = {f"{a}-{b}": intersect_volume(A[a], A[b]) for a, b in pairs}
    out["min_gap_mm"] = {
        "candle-holder(侧壁，不含杯底承托)": side_gap(A["candle"], A["holder"]),
        "candle-ring": min_distance(A["candle"], A["ring"]),
        "candle-shell": min_distance(A["candle"], A["shell"]),
        "ring_rim-shell(不含接触唇)": None,
    }
    # 裙边外缘与壳的间隙：只取托圈 r>27 的点
    rv = A["ring"].vertices
    outer = rv[np.hypot(rv[:, 0], rv[:, 1]) > 27]
    _, d, _ = trimesh.proximity.closest_point(A["shell"], outer[:: max(1, len(outer) // 5000)])
    out["min_gap_mm"]["ring_rim-shell(不含接触唇)"] = round(float(d.min()), 2)

    # 蜡烛灯取出路径：沿 +Z 拉出 80 mm 的扫掠体，与灯座、托圈不得相交（壳已取下）
    cv = A["candle"]
    sweep = trimesh.creation.cylinder(radius=float(np.hypot(cv.vertices[:, 0], cv.vertices[:, 1]).max()),
                                      height=80, sections=128)
    sweep.apply_translation([0, 0, led_z0 + 40 + 0.01])
    out["removal"] = {
        "candle_sweep_vs_holder_mm3": intersect_volume(sweep, A["holder"]),
        "candle_sweep_vs_ring_mm3": intersect_volume(sweep, A["ring"]),
    }
    # 托圈取出：托圈最小内半径 vs 灯座在托圈底面以上的最大半径
    hv = A["holder"].vertices
    above = hv[hv[:, 2] > ring_z0 + 0.05]
    out["removal"]["ring_min_inner_r"] = round(float(np.hypot(rv[:, 0], rv[:, 1]).min()), 3)
    out["removal"]["holder_max_r_above_ledge"] = round(float(np.hypot(above[:, 0], above[:, 1]).max()), 3)

    # LED 遮挡：灯顶上方的光路圆柱（半径=灯半径）内不能有任何打印件
    light = trimesh.creation.cylinder(radius=18.6, height=max(1.0, A["shell"].bounds[0][2] - (led_z0 + 36.6) + 30),
                                      sections=96)
    light.apply_translation([0, 0, led_z0 + 36.6 + light.extents[2] / 2 + 0.01])
    out["led_light_path_blocked_mm3"] = {k: intersect_volume(light, A[k]) for k in ["holder", "ring"]}

    # 7. 触手孔：沿孔轴射线是否畅通（孔中心 + 四个角）
    out["tentacle_slots"] = slot_check(m["ring"], *slot_info)

    # 9. 倾倒：估算质心与静态倾倒角
    out["stability"] = stability(A, mode)
    out["tentacle_space_mm"] = round(A["shell"].bounds[0][2] - 20.0, 2)
    out["overall_height_mm"] = round(A["shell"].bounds[1][2], 2)
    return out, A


def stadium_prism(w, l, h):
    """沿 +Z 的跑道形柱体，中心在原点。"""
    pts = []
    for cy in ((l - w) / 2, -(l - w) / 2):
        for t in np.linspace(0, 2 * math.pi, 48, endpoint=False):
            pts.append([w / 2 * math.cos(t), cy + w / 2 * math.sin(t)])
    from shapely.geometry import MultiPoint
    poly = MultiPoint(pts).convex_hull
    m = trimesh.creation.extrude_polygon(poly, h)
    m.apply_translation([0, 0, -h / 2])
    return m


def slot_check(ring, slot_r, slot_z, n):
    """在每个触手孔放一个 2.4×6.4 mm 的通道体（沿孔轴贯穿裙边），与托圈不得相交；
    同时放 3.4×7.4 mm 的大通道体，应当相交（证明孔确实约 3×7 mm，而不是更大）。"""
    clear_ok, oversize_hits = 0, 0
    for i in range(n):
        ang = i * 360 / n + 15
        for (w, l, key) in [(2.4, 6.4, "clear"), (3.4, 7.4, "over")]:
            ch = stadium_prism(w, l, 4.0)
            T = trimesh.transformations
            M = T.rotation_matrix(math.radians(ang), [0, 0, 1]) @ T.translation_matrix([slot_r, 0, slot_z]) \
                @ T.rotation_matrix(math.radians(-45), [0, 1, 0])
            ch.apply_transform(M)
            v = intersect_volume(ch, ring)
            if key == "clear" and v == 0.0:
                clear_ok += 1
            if key == "over" and isinstance(v, float) and v > 0.01:
                oversize_hits += 1
    return {"slots": n, "clear_2.4x6.4_passes": clear_ok, "oversize_3.4x7.4_blocked": oversize_hits,
            "note": "通道体长 4 mm，垂直于 45° 裙面；只检查裙边本身，穿过后纸条可自由弯折"}


def printed_mass(m, density, infill=0.15, shell_mm=1.3):
    shell_v = min(m.volume, m.area * shell_mm / 2 * 1.0)
    return density * (shell_v + infill * (m.volume - shell_v)) / 1000.0


def stability(A, mode):
    PETG, PLA = 1.27, 1.24
    parts = {
        "base": (printed_mass(A["base"], PETG), A["base"].center_mass),
        "pole": (printed_mass(A["pole"], PETG), A["pole"].center_mass),
        "holder": (printed_mass(A["holder"], PLA), A["holder"].center_mass),
        "ring": (printed_mass(A["ring"], PLA), A["ring"].center_mass),
        # 下面两项是假设值，需实物称重
        "candle(假设 30 g)": (30.0, A["candle"].center_mass),
        "shell(假设 15 g)": (15.0, A["shell"].bounds.mean(axis=0)),
    }
    M = sum(v[0] for v in parts.values())
    zc = sum(v[0] * v[1][2] for v in parts.values()) / M
    tip = math.degrees(math.atan(42.0 / zc))
    # 底部配重槽放 40 g 硬币
    M2, zc2 = M + 40, (M * zc + 40 * 4) / (M + 40)
    return {
        "mass_g": {k: round(v[0], 1) for k, v in parts.items()},
        "total_g": round(M, 1),
        "cg_height_mm": round(zc, 1),
        "static_tip_angle_deg": round(tip, 1),
        "with_40g_weights": {"cg_height_mm": round(zc2, 1),
                             "static_tip_angle_deg": round(math.degrees(math.atan(42.0 / zc2)), 1)},
    }


def main():
    report = {}
    with tempfile.TemporaryDirectory() as tmp:
        for mode in ["B", "A"]:
            report[mode], _ = check_mode(mode, tmp)
    out = ROOT / "Preview" / "verify_report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    sys.exit(main())
