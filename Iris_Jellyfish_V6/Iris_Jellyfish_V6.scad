// =====================================================================
// Iris Jellyfish Lamp V6 —— 海胆水母小夜灯（参数化 OpenSCAD）
// 单位：mm。Z 轴向上，底座底面中心为原点。
//
// 导出单个零件（mode = "B" 默认，小开口海胆；"A" 为大开口海胆）：
//   openscad -o STL/Base.stl                -D 'part="base"'   Iris_Jellyfish_V6.scad
//   openscad -o STL/Center_Pole.stl         -D 'part="pole"'   Iris_Jellyfish_V6.scad
//   openscad -o STL/LED_Holder.stl          -D 'part="holder"' Iris_Jellyfish_V6.scad
//   openscad -o STL/Shell_Tentacle_Ring.stl -D 'part="ring"'   Iris_Jellyfish_V6.scad
//   模式 A：再加 -D 'mode="A"'（只有灯座和托圈会变）
// 预览：part = "assembly" / "exploded"（含海胆壳与蜡烛灯的示意模型，不导出打印）
// =====================================================================

/* [选择] */
part = "assembly";   // base | pole | holder | ring | assembly | exploded | shell | candle
mode = "B";          // "B" 灯在海胆壳下方（默认）；"A" 灯伸进海胆壳

/* [实物尺寸 —— 请用卡尺实测后修改] */
shell_d       = 70;    // 海胆壳最大外径
shell_h       = 40;    // 海胆壳高度（仅用于示意模型）
shell_open_d  = 24;    // 海胆壳底部开口直径（仅示意；模式 A 需 ≥ led_d + 3）
shell_sag     = 5.5;   // 海胆壳最低点比托圈接触唇顶面低多少（壳越扁越小）
led_d         = 37.2;  // KC018 外径
led_h         = 36.6;  // KC018 总高（含灯头）

/* [展示空间] */
// 底座顶面 → 海胆壳最低点 的竖直距离（触手展示空间），支撑柱长度据此反算
tentacle_space = 65;

/* [配合公差] */
led_fit     = 0.4;   // 蜡烛灯与灯杯的单边间隙
peg_fit     = 0.2;   // 插销孔单边间隙
rib_protrude= 0.25;  // 插销孔内压缩筋凸出量（>peg_fit 形成 0.05 mm 轻微过盈）
led_rib_h   = 0.3;   // 灯杯内定位筋凸出量（留 0.1 mm 单边间隙，柔性定位）
ring_fit    = 0.3;   // 托圈套筒与灯座定位环的单边间隙

/* [模式参数] */
led_gap        = 2;   // 模式 B：灯顶与海胆壳最低点的间隙
cup_wall_B     = 17;  // 模式 B：灯杯包住蜡烛灯底部的高度
cup_wall_A     = 8;   // 模式 A：灯杯包住的高度
mode_a_insert  = 14;  // 模式 A：灯顶高出托圈接触面多少（伸进壳内）

/* [底座] */
base_d     = 86;
base_h     = 20;
base_top_r = 9;      // 顶部圆角
base_bot_c = 0.6;    // 底部 45° 小倒角（缓解象脚，免悬空）
weight_groove = true;// 底部隐藏环形配重槽（45° 顶面免支撑；可放硬币+热熔胶，不放也能用）
groove_r1  = 17;
groove_r2  = 33;

/* [支撑柱] */
pole_d   = 12;
peg_d    = 8;
peg_len  = 10;      // 两端插销长度（两端相同，正反都能插）
seat_h   = 2;       // 45° 锥形肩，自动对中

/* [灯座] */
hub_d       = 18;
cup_wall_t  = 2.4;
lower_step  = 2.0;  // 定位环下方台阶（托圈坐在上面）宽度
spigot_h    = 3;    // 托圈定位环高度
floor_t_min = 3;
socket_depth= 13;   // = peg_len + seat_h + 1，插销到底仍留 0.8 mm

/* [托圈] */
ring_od     = 62;   // 托圈（触手裙边）外径
sleeve_t    = 1.8;
lip_r       = 2.0;  // 接触唇圆弧半径
skirt_t     = 2.2;  // 裙边厚度（垂直于斜面）
slot_n      = 12;   // 触手孔数量（10–12）
slot_w      = 3.0;  // 触手长孔宽（可穿 2.5 mm 线/丝带）
slot_l      = 7.0;  // 触手长孔长（可穿 ≤6 mm 宽纸条）
slot_round  = 0.6;  // 孔口圆角

$fn = 128;

// ------------------------- 推导尺寸 -------------------------
eps       = 0.01;
base_r    = base_d / 2;
pole_r    = pole_d / 2;
peg_r     = peg_d / 2;
hole_r    = peg_r + peg_fit;
cup_r_in  = (led_d / 2) + led_fit;          // 19.0
cup_r_out = cup_r_in + cup_wall_t;          // 21.4 = 定位环外半径
low_r     = cup_r_out + lower_step;         // 23.4
ring_r_in = cup_r_out + ring_fit;           // 21.7
sleeve_r  = ring_r_in + sleeve_t;           // 23.5
skirt_r   = ring_od / 2;

floor_B   = socket_depth + floor_t_min;     // 14：灯杯底面（灯座本地坐标）
// 托圈接触面（唇顶）相对灯座底面的高度——两种模式相同，因此共用支撑柱
contact_rel = floor_B + led_h + led_gap + shell_sag;
floor_z   = (mode == "A") ? contact_rel + mode_a_insert - led_h : floor_B;
cup_wall  = (mode == "A") ? cup_wall_A : cup_wall_B;
ledge_z   = floor_z + cup_wall;
holder_h  = ledge_z + spigot_h;
ring_h    = contact_rel - ledge_z;          // 托圈总高（底面→唇顶）
cone_h    = low_r - hub_d / 2;              // 45° 锥高
cone_z0   = max(0, floor_z - 13);

// 支撑柱：由触手空间反算本体长度
seat_drop = peg_fit;                        // 45° 锥肩落入沉孔的深度
// 海胆壳最低点 = 底座顶 + pole_len - 2*seat_drop + contact_rel - shell_sag
pole_len  = tentacle_space - (contact_rel - shell_sag) + 2 * seat_drop;
pole_total= 2 * (peg_len + seat_h) + pole_len;

// 装配高度（世界坐标）
pole_z0   = base_h - seat_drop - seat_h - peg_len; // 支撑柱底端（下插销端面）
pole_top  = pole_z0 + peg_len + seat_h + pole_len; // 支撑柱本体上端
holder_z0 = pole_top - seat_drop;                  // 灯座底面
contact_z = holder_z0 + contact_rel;               // 托圈唇顶
ring_z0   = holder_z0 + ledge_z;
led_z0    = holder_z0 + floor_z;
shell_bottom_z = contact_z - shell_sag;

echo(str("[V6] mode=", mode,
         " pole_len=", pole_len, " pole_total=", pole_total,
         " holder_h=", holder_h, " ring_h=", ring_h,
         " contact_z=", contact_z, " shell_bottom_z=", shell_bottom_z,
         " led_top_z=", led_z0 + led_h, " overall_h~", shell_bottom_z + shell_h));
assert(pole_len >= 8, "tentacle_space 太小：支撑柱本体不足 8 mm");
assert(ring_h >= 13, "托圈高度不足：调整 cup_wall_* 或 mode_a_insert");
// 机器可读的装配位置（verify.py 使用）
echo(str("[V6POS]", pole_z0, ",", holder_z0, ",", ring_z0, ",", led_z0, ",", shell_bottom_z, ",", contact_z, ",", pole_len));
if (mode == "A" && shell_open_d < led_d + 3)
    echo("[V6][警告] 模式 A 需要海胆开口 ≥ led_d + 3 mm，当前示意开口偏小");

// ------------------------- 通用模块 -------------------------
// 插销孔刀具：开口在 z=0，向 +z 深入；带 45° 沉孔和 3 条压缩筋
module socket_cutter(depth) {
    difference() {
        union() {
            translate([0, 0, -eps]) cylinder(r = hole_r, h = depth + eps);
            // 45° 沉孔，与支撑柱锥肩配合（单边留 peg_fit）
            translate([0, 0, -eps])
                cylinder(r1 = pole_r + peg_fit + eps, r2 = hole_r, h = seat_h + eps);
        }
        // 压缩筋（凸出 rib_protrude，比间隙多 0.05 mm），入口 2.5 mm 内不设筋
        for (a = [0 : 120 : 359]) rotate(a)
            translate([hole_r + 0.6 - rib_protrude, 0, seat_h + 0.5])
                cylinder(r = 0.6, h = depth - seat_h - 0.5, $fn = 24);
    }
}

// ------------------------- Part 1：底座 -------------------------
module base_profile() {
    hull() {
        square([1, base_h]);
        square([base_r - base_bot_c, eps]);
        translate([base_r - eps, base_bot_c]) square([eps, eps]);
        translate([base_r - base_top_r, base_h - base_top_r]) circle(r = base_top_r, $fn = 64);
    }
}
module base() {
    difference() {
        rotate_extrude() base_profile();
        // 顶部支撑柱插孔（开口朝上）
        translate([0, 0, base_h]) mirror([0, 0, 1]) socket_cutter(socket_depth);
        // 底部环形配重槽：45° 屋顶，打印免支撑
        if (weight_groove)
            rotate_extrude()
                polygon([[groove_r1, -1], [groove_r2, -1],
                         [groove_r2, 0], [(groove_r1 + groove_r2) / 2, (groove_r2 - groove_r1) / 2],
                         [groove_r1, 0]]);
    }
}

// ------------------------- Part 2：中央支撑柱 -------------------------
// 用 cylinder 拼装（rotate_extrude 实心件会在轴线留下退化三角形）
module pole() {
    ch = 0.8;                   // 插销头部倒角
    z1 = peg_len;               // 下锥肩起点
    z2 = z1 + seat_h;           // 本体起点
    z3 = z2 + pole_len;         // 本体终点
    z4 = z3 + seat_h;           // 上插销起点
    z5 = z4 + peg_len;          // 顶端
    union() {
        cylinder(r1 = peg_r - ch, r2 = peg_r, h = ch + eps);
        translate([0, 0, ch]) cylinder(r = peg_r, h = z1 - ch + eps);
        translate([0, 0, z1]) cylinder(r1 = peg_r, r2 = pole_r, h = seat_h + eps);  // 45° 锥肩
        translate([0, 0, z2]) cylinder(r = pole_r, h = pole_len + eps);
        translate([0, 0, z3]) cylinder(r1 = pole_r, r2 = peg_r, h = seat_h + eps);
        translate([0, 0, z4]) cylinder(r = peg_r, h = peg_len - ch + eps);
        translate([0, 0, z5 - ch]) cylinder(r1 = peg_r, r2 = peg_r - ch, h = ch);
    }
}

// ------------------------- Part 3：LED 灯座 -------------------------
module holder_profile() {
    polygon([
        [0, 0], [hub_d / 2, 0],
        [hub_d / 2, cone_z0],
        [low_r, cone_z0 + cone_h],          // 45° 锥，免支撑
        [low_r, ledge_z],                   // 托圈坐落台阶
        [cup_r_out, ledge_z],
        [cup_r_out, holder_h - 0.6],
        [cup_r_out - 0.6, holder_h],        // 顶缘倒角
        [0, holder_h]
    ]);
}
module holder() {
    difference() {
        rotate_extrude() holder_profile();
        // 底部插孔（开口朝下，平顶 8.4 mm 小桥接）
        socket_cutter(socket_depth);
        // 灯杯：内壁 + 3 条柔性定位筋（不是卡扣）
        difference() {
            union() {
                translate([0, 0, floor_z]) cylinder(r = cup_r_in, h = holder_h);
                // 入口 1 mm 倒角，方便放入
                translate([0, 0, holder_h - 1]) cylinder(r1 = cup_r_in, r2 = cup_r_in + 1, h = 1 + eps);
            }
            for (a = [60 : 120 : 359]) rotate(a)
                hull() {
                    translate([cup_r_in + 0.8 - led_rib_h, 0, floor_z + 2])  sphere(r = 0.8, $fn = 24);
                    translate([cup_r_in + 0.8 - led_rib_h, 0, holder_h - 2.5]) sphere(r = 0.8, $fn = 24);
                }
        }
    }
}

// ------------------------- Part 4：海胆托圈 + 触手挂环 -------------------------
lip_c   = [ring_r_in + lip_r + 0.3, ring_h - lip_r];     // 接触唇圆心
rim_top = ring_h - 1.0;                                   // 裙边顶低于唇顶 1 mm
rim_c   = [skirt_r - skirt_t / 2, rim_top - skirt_t / 2];
skirt_in_c = [sleeve_r - 0.5, rim_c[1] - (rim_c[0] - (sleeve_r - 0.5))];  // 45° 中线内端
// 裙边下缘的 45° 切线：从外圆头下切点延伸到套筒内，避免内端圆头产生悬空
skirt_low_t = rim_c + (skirt_t / 2) * [sin(45), -cos(45)];
skirt_low_z = skirt_low_t[1] - (skirt_low_t[0] - (sleeve_r - 0.5));

module ring_profile() {
    union() {
        // 套筒
        translate([ring_r_in, 0]) square([sleeve_t, lip_c[1]]);
        // 接触唇：圆弧顶 + 两侧斜面（无水平悬空）
        hull() {
            translate(lip_c) circle(r = lip_r, $fn = 64);
            translate([ring_r_in, lip_c[1] - 4]) square([sleeve_t, eps]);
        }
        // 45° 裙边（水母伞下缘），两端圆头
        hull() {
            translate(rim_c) circle(r = skirt_t / 2, $fn = 48);
            translate([sleeve_r - 0.5, skirt_low_z]) square([0.5, skirt_t * sqrt(2)]);
        }
    }
}

// 圆角长孔刀具：沿 +z 贯穿厚度 t，两端孔口圆角
module rounded_slot_cutter(t) {
    module stadium(w, l, h) {
        hull() for (s = [-1, 1]) translate([0, s * (l - w) / 2, 0]) cylinder(d = w, h = h, $fn = 32);
    }
    steps = [[0, 1], [0.25, 0.42], [0.5, 0.13], [0.75, 0.02], [1, 0]];
    translate([0, 0, -t]) stadium(slot_w, slot_l, 3 * t);
    for (sgn = [-1, 1])
        for (i = [0 : len(steps) - 2]) hull() {
            for (k = [i, i + 1]) {
                d  = steps[k][0] * slot_round;
                o  = steps[k][1] * slot_round;
                z  = (sgn > 0) ? t / 2 - d : -t / 2 + d;
                translate([0, 0, z - eps / 2]) stadium(slot_w + 2 * o, slot_l + 2 * o, eps);
            }
        }
}

slot_mid = (rim_c + skirt_in_c) / 2 + [0.6, 0.6];  // 裙边中线上略偏外的位置
echo(str("[V6SLOT]", slot_mid[0], ",", slot_mid[1], ",", slot_n));
module ring() {
    difference() {
        rotate_extrude() ring_profile();
        // 触手孔：垂直于 45° 裙面，孔口圆角
        for (i = [0 : slot_n - 1]) rotate(i * 360 / slot_n + 15)
            translate([slot_mid[0], 0, slot_mid[1]])
                rotate([0, -45, 0]) rounded_slot_cutter(skirt_t);
    }
}

// ------------------------- 示意模型（不打印） -------------------------
module shell_model() {
    // 扁球海胆壳：底部开口
    color("#d9a6c8", 0.85) difference() {
        scale([shell_d / 2, shell_d / 2, shell_h / 2]) sphere(r = 1, $fn = 96);
        scale([shell_d / 2 - 1.2, shell_d / 2 - 1.2, shell_h / 2 - 1.2]) sphere(r = 1, $fn = 96);
        translate([0, 0, -shell_h / 2 - 1]) cylinder(d = (mode == "A") ? max(shell_open_d, led_d + 4) : shell_open_d, h = 6);
    }
}
module candle_model() {
    color("#fff3c4") {
        cylinder(d = led_d, h = led_h - 6);
        translate([0, 0, led_h - 6]) scale([0.25, 0.25, 1]) cylinder(r1 = 10, r2 = 2, h = 6);
    }
}

module assembled(explode = 0) {
    color("#bfe9f5", 0.6) base();
    color("#bfe9f5", 0.7) translate([0, 0, pole_z0 + explode * 1.0]) pole();
    color("#f4f0fa") translate([0, 0, holder_z0 + explode * 2.0]) holder();
    translate([0, 0, led_z0 + explode * 3.0]) candle_model();
    color("#c9a3dd") translate([0, 0, ring_z0 + explode * 3.6]) ring();
    translate([0, 0, shell_bottom_z + shell_h / 2 + explode * 4.6]) shell_model();
}

if      (part == "base")     base();
else if (part == "pole")     pole();
else if (part == "holder")   holder();
else if (part == "ring")     ring();
else if (part == "shell")    shell_model();
else if (part == "candle")   candle_model();
else if (part == "exploded") assembled(25);
else                         assembled(0);
