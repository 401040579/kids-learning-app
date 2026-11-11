"""把四个 STL 摆到 Bambu 256×256 打印板上，导出一个通用 3MF（可选，STL 才是正式交付）。
材料/颜色需在 Bambu Studio 里按 README 手动指定。"""
from pathlib import Path

import trimesh

ROOT = Path(__file__).resolve().parent.parent
layout = {
    "Base": ("STL/Base.stl", (70, 70)),
    "Center_Pole": ("STL/Center_Pole.stl", (175, 60)),
    "LED_Holder": ("STL/LED_Holder.stl", (70, 185)),
    "Shell_Tentacle_Ring": ("STL/Shell_Tentacle_Ring.stl", (180, 180)),
}
scene = trimesh.Scene()
for name, (path, (x, y)) in layout.items():
    m = trimesh.load(ROOT / path, force="mesh")
    m.apply_translation([x, y, -m.bounds[0][2]])
    scene.add_geometry(m, node_name=name, geom_name=name)
out = ROOT / "Iris_Jellyfish_V6_plate.3mf"
scene.export(out)
back = trimesh.load(out)
print(out.name, out.stat().st_size, "objects:", len(back.geometry),
      "all watertight:", all(g.is_watertight for g in back.geometry.values()))
