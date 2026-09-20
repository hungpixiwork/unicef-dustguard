import zipfile, os, re

source_3mf = r'd:\07-Competitions-Hackathons\unicef-dustguard\11\enclosure_v2\DustGuard_V2_printplate_LED.3mf'
target_dir = r'd:\07-Competitions-Hackathons\unicef-dustguard\11\enclosure_v2'

with zipfile.ZipFile(source_3mf, 'r') as z:
    model_xml = z.read('3D/3dmodel.model').decode('utf-8')
    rels = z.read('_rels/.rels')
    types = z.read('[Content_Types].xml')

# 1. Create Plate 1: Body + Lid (Separated: Body at Y=-55, Lid at Y=+55)
# In 3MF matrix: '1.0 0.0 0.0 0.0 1.0 0.0 0.0 0.0 1.0 dx dy dz'
body_trans = '1.0 0.0 0.0 0.0 1.0 0.0 0.0 0.0 1.0 0.0 -55.0 0.0'
lid_trans = '1.0 0.0 0.0 0.0 1.0 0.0 0.0 0.0 1.0 0.0 55.0 0.0'

pattern_build = r'<build>.*?</build>'
build_p1 = f'''<build><item objectid="1" transform="{body_trans}" partnumber="DustGuard_V2_body"/><item objectid="2" transform="{lid_trans}" partnumber="DustGuard_V2_lid_LED"/></build>'''
xml_p1 = re.sub(pattern_build, build_p1, model_xml, flags=re.DOTALL)

out_p1 = os.path.join(target_dir, 'DustGuard_V2_Plate1_Body_and_Lid_PETG.3mf')
with zipfile.ZipFile(out_p1, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
    zout.writestr('3D/3dmodel.model', xml_p1.encode('utf-8'))
    zout.writestr('_rels/.rels', rels)
    zout.writestr('[Content_Types].xml', types)
print('Created:', out_p1)

# 2. Create Plate 2: TPU Gasket alone
build_p2 = '<build><item objectid="3" transform="1.0 0.0 0.0 0.0 1.0 0.0 0.0 0.0 1.0 0.0 0.0 0.0" partnumber="DustGuard_V2_TPU_gasket"/></build>'
xml_p2 = re.sub(pattern_build, build_p2, model_xml, flags=re.DOTALL)

out_p2 = os.path.join(target_dir, 'DustGuard_V2_Plate2_Gasket_TPU.3mf')
with zipfile.ZipFile(out_p2, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
    zout.writestr('3D/3dmodel.model', xml_p2.encode('utf-8'))
    zout.writestr('_rels/.rels', rels)
    zout.writestr('[Content_Types].xml', types)
print('Created:', out_p2)
