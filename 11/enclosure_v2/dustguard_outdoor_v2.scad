/*
 DustGuard Outdoor Enclosure V2
 Parametric, 3D-printable concept for APM2000 + ESP32 NodeMCU-32S.
 Units: mm

 Parts:
   part = "body"        sealed rear body with rain hood, side labyrinth vents, pole/wall mounts
   part = "lid_led"     front lid with 3 mm light-pipe openings
   part = "lid_sealed"  front lid without LED openings
   part = "gasket"      TPU gasket ring
   part = "assembly"    closed preview
   part = "exploded"    exploded preview

 Notes:
 - Water-resistant design intent only; no IP rating is claimed without testing.
 - Use PG7/M12-ish cable gland in 12.7 mm bottom hole.
 - Lid screws are intended for M3 + heat-set inserts in body bosses.
*/

$fn = 48;
part = "assembly";

// ---------- Main envelope ----------
W = 110;
H = 90;
D = 44;
wall = 2.7;
corner_r = 7;

lid_t = 3.0;
lid_gap = 0.35;
front_inset = 1.4;

// Body front compression ridge / gasket
ridge_outer_w = W - wall;
ridge_outer_h = H - wall;
ridge_width = 1.6;
ridge_h = 1.0;
ridge_r = 4.5;

// Screw bosses
boss_od = 9.0;
insert_d = 4.2;      // common M3 heat-set insert pilot; verify your inserts
screw_x = W/2 - 10.5;
screw_y = H/2 - 10.5;

// Cable gland
cable_hole_d = 12.7;

// Mounting ears
mount_ear_w = 13;
mount_ear_h = 70;
mount_ear_t = 4.2;
strap_slot_w = 5.2;
strap_slot_h = 19;

// Vents / rain labyrinth
vent_window_h = 31;
vent_window_d = 12;
vent_center_y = -1;
vent_center_z = 23;
vent_cover_gap = 4.0;
vent_cover_t = 1.8;
vent_cover_h = 39;
vent_cover_d = 19;

// Roof canopy
eave_front = 11;
eave_side = 4;
roof_t = 2.2;
roof_back_z = 4;

// Interior device nominal sizes
APM_W = 49;
APM_H = 31.5;
APM_D = 10.8;
ESP_W = 25.4;
ESP_H = 48.3;

// ---------- Helpers ----------
module rounded_rect_2d(w,h,r){
    hull(){
        for (x=[-w/2+r, w/2-r])
            for (y=[-h/2+r, h/2-r])
                translate([x,y]) circle(r=r);
    }
}

module rr_prism(w,h,d,r){
    linear_extrude(height=d) rounded_rect_2d(w,h,r);
}

module rr_ring(w,h,r,width,height){
    difference(){
        linear_extrude(height=height) rounded_rect_2d(w,h,r);
        translate([0,0,-0.1]) linear_extrude(height=height+0.2)
            rounded_rect_2d(w-2*width,h-2*width,max(0.2,r-width));
    }
}

module rounded_slot_2d(w,h){
    // w = short dimension, h = long dimension
    hull(){
        translate([0,-h/2+w/2]) circle(d=w);
        translate([0, h/2-w/2]) circle(d=w);
    }
}

module keyhole_2d(){
    union(){
        translate([0,5]) circle(d=7.4);
        translate([0,-3]) rounded_slot_2d(3.8,14);
    }
}

module screw_boss(x,y){
    translate([x,y,wall-0.30])
    difference(){
        cylinder(h=D-wall-0.90, d=boss_od);
        translate([0,0,-0.1]) cylinder(h=D-wall+0.5, d=insert_d);
    }
}

module mounting_ears(){
    // External side rails at the back; no penetration into sealed cavity
    difference(){
        union(){
            for (sx=[-1,1])
                translate([sx*(W/2 + mount_ear_w/2 - 0.6),0,0])
                    rr_prism(mount_ear_w,mount_ear_h,mount_ear_t,3);
        }
        // two strap slots on each side
        for (sx=[-1,1])
            for (yy=[-21,21])
                translate([sx*(W/2 + mount_ear_w/2 - 0.6),yy,-0.1])
                    linear_extrude(height=mount_ear_t+0.2)
                        rounded_slot_2d(strap_slot_w,strap_slot_h);
        // central wall keyhole on each ear
        for (sx=[-1,1])
            translate([sx*(W/2 + mount_ear_w/2 - 0.6),0,-0.1])
                linear_extrude(height=mount_ear_t+0.2) keyhole_2d();
    }
}

module side_vent_cut(sx=1){
    translate([sx*(W/2-wall/2), vent_center_y, vent_center_z])
        cube([wall+1.2,vent_window_h,vent_window_d], center=true);
}

module side_rain_hood(sx=1){
    // A sealed outer baffle with an open lower edge: air enters from below,
    // turns upward behind cover, then passes through side opening.
    outer_x = sx*(W/2 + vent_cover_gap + vent_cover_t/2);
    // main shield
    translate([outer_x, vent_center_y+2, vent_center_z])
        cube([vent_cover_t,vent_cover_h,vent_cover_d], center=true);
    // top cap
    translate([sx*(W/2 + vent_cover_gap/2), vent_center_y+vent_cover_h/2+0.5, vent_center_z])
        cube([vent_cover_gap+vent_cover_t,2.0,vent_cover_d], center=true);
    // front/back end caps, leaving bottom open
    for (zz=[vent_center_z-vent_cover_d/2+0.9, vent_center_z+vent_cover_d/2-0.9])
        translate([sx*(W/2 + vent_cover_gap/2),vent_center_y+2,zz])
            cube([vent_cover_gap+vent_cover_t,vent_cover_h,1.8], center=true);
    // cosmetic / stiffness ribs on cover
    for (yy=[-12,-6,0,6,12])
        translate([sx*(W/2 + vent_cover_gap + vent_cover_t + 0.45),vent_center_y+yy,vent_center_z])
            cube([0.9,1.4,vent_cover_d-2],center=true);
}

module roof_canopy(){
    // Top rain eave. When the body is printed back-down, this is a vertical fin,
    // so it prints cleanly without a large unsupported horizontal roof.
    roof_w = W + 2*eave_side;
    roof_len = D + eave_front - roof_back_z;
    translate([-roof_w/2, H/2-0.9, roof_back_z])
        cube([roof_w, roof_t, roof_len], center=false);
    // Front drip nose / stiffness rib, deliberately simple and printable.
    translate([0,H/2-0.15,D+eave_front-1.15])
        cube([roof_w,2.5,2.3], center=true);
}

module gland_reinforcement(){
    // Reinforced bottom boss surrounding PG7-style hole
    translate([0,-H/2-1.4,D/2])
        rotate([90,0,0])
        difference(){
            cylinder(h=4.8,d=20,center=true);
            cylinder(h=5.2,d=cable_hole_d,center=true);
        }
}

module interior_apm_tray(){
    // Low corner rails for foam-tape / strap retention, no exact sensor holes assumed.
    x0 = -25;
    y0 = 8;
    z0 = wall-0.25;
    tray_w = APM_W + 2.0;
    tray_h = APM_H + 2.0;
    rail_t = 1.8;
    rail_h = 3.0;
    // four corner stops
    for (sx=[-1,1]) for (sy=[-1,1])
        translate([x0+sx*(tray_w/2-rail_t/2), y0+sy*(tray_h/2-5), z0])
            cube([rail_t,10,rail_h]);
    // lower datum ledge
    translate([x0-tray_w/2,y0-tray_h/2,z0]) cube([tray_w,rail_t,rail_h]);
}

module interior_esp_tray(){
    x0 = 31;
    y0 = 3;
    z0 = wall-0.25;
    gap = ESP_W + 1.2;
    rail_t=2.0;
    rail_h=3.2;
    len=ESP_H+2;
    // slide rails along long edges, open at bottom (USB/cable end)
    translate([x0-gap/2-rail_t,y0-len/2,z0]) cube([rail_t,len,rail_h]);
    translate([x0+gap/2,y0-len/2,z0]) cube([rail_t,len,rail_h]);
    // top stop
    translate([x0-gap/2-rail_t,y0+len/2-rail_t,z0]) cube([gap+2*rail_t,rail_t,rail_h]);
}

module body(){
    difference(){
        union(){
            // main open-front shell
            difference(){
                rr_prism(W,H,D,corner_r);
                translate([0,0,wall])
                    rr_prism(W-2*wall,H-2*wall,D-wall+1.0,max(1,corner_r-wall));
            }
            mounting_ears();
            // compression ridge around opening
            translate([0,0,D-0.22]) rr_ring(ridge_outer_w,ridge_outer_h,ridge_r,ridge_width,ridge_h);
            // screw bosses
            for (xx=[-screw_x,screw_x]) for (yy=[-screw_y,screw_y]) screw_boss(xx,yy);
            side_rain_hood(-1);
            side_rain_hood(1);
            roof_canopy();
            gland_reinforcement();
            interior_apm_tray();
            interior_esp_tray();
        }
        // Side airflow apertures, fully sheltered by external labyrinth covers
        side_vent_cut(-1);
        side_vent_cut(1);
        // Bottom cable gland hole, axis through bottom wall
        translate([0,-H/2-0.2,D/2])
            rotate([90,0,0]) cylinder(h=wall+6,d=cable_hole_d,center=true);
        // Optional tiny drain hole at absolute bottom rear, 2.2 mm
        translate([0,-H/2-0.1,8])
            rotate([90,0,0]) cylinder(h=wall+2,d=2.2,center=true);
    }
}

module lid_common(led_holes=true){
    lidW=W-2.4;
    lidH=H-2.4;
    lidR=corner_r-1.3;
    difference(){
        union(){
            rr_prism(lidW,lidH,lid_t,lidR);
            // very shallow raised border on exterior
            translate([0,0,lid_t]) rr_ring(lidW-5,lidH-5,lidR-2,0.9,0.6);
            // simple raised DustGuard wordmark
            translate([0,7,lid_t-0.16])
                linear_extrude(height=0.81)
                    text("DustGuard",size=10,halign="center",valign="center",font="DejaVu Sans:style=Bold");
        }
        // gasket groove on inside face (z=0 side), 1.1 mm deep
        translate([0,0,-0.02])
            rr_ring(ridge_outer_w+0.5,ridge_outer_h+0.5,ridge_r+0.25,ridge_width+0.8,1.12);
        // M3 lid clearance holes
        for (xx=[-screw_x,screw_x]) for (yy=[-screw_y,screw_y])
            translate([xx,yy,-0.1]) cylinder(h=lid_t+1.0,d=3.4);
        // countersinks/counterbores
        for (xx=[-screw_x,screw_x]) for (yy=[-screw_y,screw_y])
            translate([xx,yy,lid_t-1.2]) cylinder(h=1.4,d=6.6);
        if (led_holes){
            for (xx=[-10,0,10])
                translate([xx,-21,-0.1]) cylinder(h=lid_t+1.2,d=3.3);
            // shallow counterbore to seat 3mm light-pipe/clear epoxy
            for (xx=[-10,0,10])
                translate([xx,-21,lid_t-1.1]) cylinder(h=1.25,d=5.0);
        }
    }
    if (led_holes){
        translate([0,-14,lid_t-0.14])
            linear_extrude(height=0.59)
                text("PWR     Wi-Fi     DATA",size=3.1,halign="center",valign="center",font="DejaVu Sans");
    }
}

module gasket(){
    // Print in TPU 95A; nominal 1.0 mm high, compressed by ridge.
    rr_ring(ridge_outer_w+0.25,ridge_outer_h+0.25,ridge_r+0.12,ridge_width+0.45,1.0);
}

module assembly(exploded=false){
    color([0.82,0.84,0.86]) body();
    zoff = exploded ? D+16 : D+ridge_h+lid_gap;
    color([0.95,0.95,0.95]) translate([0,0,zoff]) lid_common(true);
    if (exploded)
        color([0.2,0.8,0.35,0.65]) translate([0,0,D+8]) gasket();
}

// ---------- Output selector ----------
if (part=="body") body();
else if (part=="lid_led") lid_common(true);
else if (part=="lid_sealed") lid_common(false);
else if (part=="gasket") gasket();
else if (part=="exploded") assembly(true);
else assembly(false);
