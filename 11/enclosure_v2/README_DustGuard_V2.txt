DUSTGUARD OUTDOOR ENCLOSURE V2
==============================

Designed around:
- APM2000: 49 x 31.5 x 10.8 mm
- ESP32 NodeMCU-32S Ai-Thinker: 25.4 x 48.3 mm

Nominal enclosure body: 110 x 90 x 44 mm
Overall width including pole/wall mounting ears: ~134.8 mm
Overall front projection including rain eave: ~55 mm

FEATURES
- External rear mounting ears with wide slots for zip ties / stainless straps.
- External keyhole wall-mount slots; mounting holes do not penetrate the sealed electronics cavity.
- Top rain eave.
- Side airflow uses downward-open labyrinth rain covers.
- Bottom 12.7 mm PG7/M12-style cable-gland opening.
- 4 x M3 front screws with heat-set-insert bosses.
- Gasket groove + printable TPU gasket.
- Internal APM2000 locating tray and ESP32 slide rails.
- LED lid version: 3 x light-pipe openings.
- Sealed lid version: no LED openings for better ingress resistance.

IMPORTANT
This is a water-resistant enclosure design, not a certified waterproof/IP-rated product.
A particulate sensor must exchange air with the environment, so true waterproof sealing conflicts with measurement airflow.
For outdoor use, mount vertically, gland down, and perform spray/rain testing before installing electronics.

RECOMMENDED HARDWARE
- 4 x M3 x 10-12 mm stainless screws
- 4 x M3 heat-set inserts; verify actual insert OD before heating in
- 1 x PG7 or compatible cable gland requiring ~12.5-12.7 mm panel hole
- 2 x UV-resistant cable ties, 4.8-7.6 mm wide, or stainless steel straps
- TPU 95A gasket (included) or a closed-cell silicone gasket
- LED version only: 3 x 3 mm light pipes + neutral-cure silicone/epoxy

PRINT SETTINGS
BODY:
- PETG for prototype; ASA preferred for longer outdoor UV/heat exposure
- 0.4 mm nozzle, 0.20 mm layer
- 4 walls, 5 top/bottom layers, 25-35% infill
- Print BACK FACE DOWN; mounting ears lie flat on bed

LID:
- PETG/ASA, 0.20 mm layer, 4 walls, 20-30% infill
- Print flat; inspect gasket groove first layer in slicer

GASKET:
- TPU 95A, 0.20 mm layer, 100% infill

VALIDATE BEFORE FINAL OUTDOOR BUILD
1. Measure the real APM2000 and ESP32 with calipers.
2. Verify the exact APM2000 intake/exhaust orientation.
3. Verify your M3 inserts and screw length.
4. Verify the exact cable-gland panel diameter.
5. Seal LED/light-pipe interfaces if using LED lid.
6. Spray-test the empty enclosure before installing electronics.

FILES
- DustGuard_V2_body.stl
- DustGuard_V2_lid_LED.stl
- DustGuard_V2_lid_sealed.stl
- DustGuard_V2_TPU_gasket.stl
- DustGuard_V2_printplate_LED.3mf
- DustGuard_V2_printplate_sealed.3mf
- dustguard_outdoor_v2.scad (parametric source)
- DustGuard_V2_preview.png
