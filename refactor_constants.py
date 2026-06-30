import os
import re

directory = "frontend/src"

files_to_check = [
    'frontend/src/pages/Doctors.jsx',
    'frontend/src/pages/Home.jsx',
    'frontend/src/pages/Admin/AddDoctor.jsx',
    'frontend/src/pages/MyProfile.jsx',
    'frontend/src/pages/Appointment.jsx'
]

def add_import(content, import_str):
    if import_str in content: return content
    lines = content.split('\n')
    last_imp = -1
    for i, line in enumerate(lines):
        if line.startswith('import '):
            last_imp = i
    if last_imp != -1:
        lines.insert(last_imp + 1, import_str)
    else:
        lines.insert(0, import_str)
    return '\n'.join(lines)

for filepath in files_to_check:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content

    depth = filepath.replace('\\', '/').count('/') - 2
    rel = './constants' if depth == 0 else '../' * depth + 'constants'
    import_path = f"{rel}"

    # Replace specialities array
    content = re.sub(r'\[\s*"General Physician",\s*"Gynecologist",\s*"Dermatologist",\s*"Pediatricians",\s*"Neurologist",\s*"Gastroenterologist"\s*\]', 'SPECIALITIES', content)
    
    # Replace Home.jsx specialities array (which is an array of objects)
    # Actually wait, Home.jsx has [{name: "General Physician"}, ...] this is not easily replaced by SPECIALITIES array which is strings. I'll leave Home.jsx unless it's just the string array. Let's look closer:
    
    # Replace blood groups
    content = re.sub(r'\[\s*"A\+",\s*"A-",\s*"B\+",\s*"B-",\s*"AB\+",\s*"AB-",\s*"O\+",\s*"O-"\s*\]', 'BLOOD_GROUPS', content)
    
    # Replace appointment types
    content = re.sub(r'\[\s*"in-person",\s*"video",\s*"phone"\s*\]', 'APPOINTMENT_TYPES', content)

    if content != orig:
        needed_imports = []
        if 'SPECIALITIES' in content and 'SPECIALITIES' not in orig: needed_imports.append('SPECIALITIES')
        if 'BLOOD_GROUPS' in content and 'BLOOD_GROUPS' not in orig: needed_imports.append('BLOOD_GROUPS')
        if 'APPOINTMENT_TYPES' in content and 'APPOINTMENT_TYPES' not in orig: needed_imports.append('APPOINTMENT_TYPES')
        
        if needed_imports:
            imp_str = f'import {{ {", ".join(needed_imports)} }} from "{import_path}";'
            content = add_import(content, imp_str)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated", filepath)
