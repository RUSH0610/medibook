import os
import re

directory = "frontend/src"

replacements = [
    # User
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/user/login`\s*,\s*(\{.*?\})\s*\)', r'loginUser(\1)'),
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/user/register`\s*,\s*(\{.*?\})\s*\)', r'registerUser(\1)'),
    (r'axios\.get\(\s*`\$\{backendUrl\}/api/user/get-profile`\s*,\s*\{.*?token.*?\}\s*\)', r'getUserProfile(token)'),
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/user/update-profile`\s*,\s*(.*?)\s*,\s*\{.*?token.*?\}\s*\)', r'updateUserProfile(\1, token)'),
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/user/book-appointment`\s*,\s*(\{.*?\})\s*,\s*\{.*?token.*?\}\s*\)', r'bookAppointment(\1, token)'),
    (r'axios\.get\(\s*`\$\{backendUrl\}/api/user/appointments`\s*,\s*\{.*?token.*?\}\s*\)', r'listAppointments(token)'),
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/user/cancel-appointment`\s*,\s*(\{.*?\})\s*,\s*\{.*?token.*?\}\s*\)', r'cancelAppointment(\1, token)'),

    # Doctor
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/doctor/login`\s*,\s*(\{.*?\})\s*\)', r'loginDoctor(\1)'),
    (r'axios\.get\(\s*`\$\{backendUrl\}/api/doctor/list`\s*\)', r'getDoctors()'),
    (r'axios\.get\(\s*`\$\{backendUrl\}/api/doctor/profile`\s*,\s*\{.*?dtoken.*?\}\s*\)', r'getDoctorProfile(dToken)'),
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/doctor/update-profile`\s*,\s*(\{.*?\})\s*,\s*\{.*?dtoken.*?\}\s*\)', r'updateDoctorProfile(\1, dToken)'),
    (r'axios\.get\(\s*`\$\{backendUrl\}/api/doctor/dashboard`\s*,\s*\{.*?dtoken.*?\}\s*\)', r'getDoctorDashboard(dToken)'),
    (r'axios\.get\(\s*`\$\{backendUrl\}/api/doctor/appointments`\s*,\s*\{.*?dtoken.*?\}\s*\)', r'getDoctorAppointments(dToken)'),
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/doctor/complete-appointment`\s*,\s*(\{.*?\})\s*,\s*\{.*?dtoken.*?\}\s*\)', r'completeAppointment(\1, dToken)'),
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/doctor/cancel-appointment`\s*,\s*(\{.*?\})\s*,\s*\{.*?dtoken.*?\}\s*\)', r'cancelDoctorAppt(\1, dToken)'),

    # Admin
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/admin/login`\s*,\s*(\{.*?\})\s*\)', r'loginAdmin(\1)'),
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/admin/add-doctor`\s*,\s*(.*?)\s*,\s*\{.*?atoken.*?\}\s*\)', r'addDoctor(\1, aToken)'),
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/admin/all-doctors`\s*,\s*\{.*?atoken.*?\}\s*\)', r'getAllDoctors(aToken)'),
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/admin/change-availability`\s*,\s*(\{.*?\})\s*,\s*\{.*?atoken.*?\}\s*\)', r'changeAvailability(\1, aToken)'),
    (r'axios\.get\(\s*`\$\{backendUrl\}/api/admin/dashboard`\s*,\s*\{.*?atoken.*?\}\s*\)', r'getAdminDashboard(aToken)'),
    (r'axios\.get\(\s*`\$\{backendUrl\}/api/admin/appointments`\s*,\s*\{.*?atoken.*?\}\s*\)', r'getAdminAppointments(aToken)'),
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/admin/cancel-appointment`\s*,\s*(\{.*?\})\s*,\s*\{.*?atoken.*?\}\s*\)', r'cancelAdminAppt(\1, aToken)'),
    
    # some with empty object payload
    (r'axios\.post\(\s*`\$\{backendUrl\}/api/admin/all-doctors`\s*,\s*\{\}\s*,\s*\{.*?atoken.*?\}\s*\)', r'getAllDoctors(aToken)'),
]

user_funcs = ['loginUser', 'registerUser', 'getUserProfile', 'updateUserProfile', 'bookAppointment', 'listAppointments', 'cancelAppointment']
doc_funcs = ['loginDoctor', 'getDoctors', 'getDoctorProfile', 'updateDoctorProfile', 'getDoctorDashboard', 'getDoctorAppointments', 'completeAppointment', 'cancelDoctorAppt']
admin_funcs = ['loginAdmin', 'addDoctor', 'getAllDoctors', 'changeAvailability', 'getAdminDashboard', 'getAdminAppointments', 'cancelAdminAppt']

def process_file(filepath):
    if not filepath.endswith('.jsx'):
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig = content
    if 'axios' not in content:
        return
        
    for pat, rep in replacements:
        content = re.sub(pat, rep, content, flags=re.DOTALL)
        
    if content != orig:
        # remove axios import
        content = re.sub(r'import axios from "axios";\n?', '', content)
        
        # add imports
        u_used = [f for f in user_funcs if f + '(' in content]
        d_used = [f for f in doc_funcs if f + '(' in content]
        a_used = [f for f in admin_funcs if f + '(' in content]
        
        depth = filepath.replace('\\', '/').count('/') - 2
        rel = './services' if depth == 0 else '../' * depth + 'services'
        
        imp = ""
        if u_used: imp += f'import {{ {", ".join(u_used)} }} from "{rel}/user.service.js";\n'
        if d_used: imp += f'import {{ {", ".join(d_used)} }} from "{rel}/doctor.service.js";\n'
        if a_used: imp += f'import {{ {", ".join(a_used)} }} from "{rel}/admin.service.js";\n'
        
        if imp:
            # add after last import
            lines = content.split('\n')
            last_imp = -1
            for i, line in enumerate(lines):
                if line.startswith('import '):
                    last_imp = i
            if last_imp != -1:
                lines.insert(last_imp + 1, imp.strip())
            else:
                lines.insert(0, imp.strip())
            content = '\n'.join(lines)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated", filepath)

for root, dirs, files in os.walk(directory):
    for f in files:
        process_file(os.path.join(root, f))
