#!/bin/bash
# 一键生成全部 STL（需要 OpenSCAD 2026+，推荐 manifold 后端）
set -e
cd "$(dirname "$0")"
S=Iris_Jellyfish_V6.scad
O="openscad --backend=manifold --export-format binstl"
mkdir -p STL/Mode_A
$O -o STL/Base.stl                -D 'part="base"'   $S
$O -o STL/Center_Pole.stl         -D 'part="pole"'   $S
$O -o STL/LED_Holder.stl          -D 'part="holder"' $S
$O -o STL/Shell_Tentacle_Ring.stl -D 'part="ring"'   $S
$O -o STL/Mode_A/LED_Holder_ModeA.stl          -D 'part="holder"' -D 'mode="A"' $S
$O -o STL/Mode_A/Shell_Tentacle_Ring_ModeA.stl -D 'part="ring"'   -D 'mode="A"' $S
