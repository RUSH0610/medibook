import os
import re

# 3. Replace backendUrl usage in context across all files
for root, _, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.jsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            orig = content
            # Remove backendUrl from useContext
            content = re.sub(r'backendUrl,\s*', '', content)
            content = re.sub(r',\s*backendUrl', '', content)
            content = re.sub(r'\{\s*backendUrl\s*\}\s*=\s*useContext', '{  } = useContext', content)
            
            # Add local backendUrl if it still uses it
            if 'backendUrl' in content and 'import.meta.env.VITE_BACKEND_URL' not in content:
                content = re.sub(r'(import .*?;)', r'\1\nconst backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";', content, count=1)
            
            if content != orig:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)

# Fix specific files that SHOULD be using services (AddDoctor.jsx, Doctors.jsx, Doctor/Dashboard.jsx, Appointment.jsx)
def replace_in_file(path, pattern, replacement):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    c = re.sub(pattern, replacement, c, flags=re.DOTALL)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

# AddDoctor.jsx
replace_in_file('frontend/src/pages/Admin/AddDoctor.jsx', 
    r'const \{ data \} = await axios\.post\(\s*`\$\{backendUrl\}/api/admin/add-doctor`,\s*fd,\s*\{\s*headers:\s*\{\s*atoken:\s*aToken\s*\}\s*,?\s*\}\s*,?\s*\);',
    r'const { data } = await addDoctor(fd, aToken);')
replace_in_file('frontend/src/pages/Admin/AddDoctor.jsx', r'import axios from "axios";', r'import { addDoctor } from "../../services/admin.service.js";')

# Doctors.jsx (Admin)
replace_in_file('frontend/src/pages/Admin/Doctors.jsx', 
    r'const \{ data \} = await axios\.post\(\s*`\$\{backendUrl\}/api/admin/all-doctors`,\s*\{\},\s*\{\s*headers:\s*\{\s*atoken:\s*aToken\s*\}\s*,?\s*\}\s*,?\s*\);',
    r'const { data } = await getAllDoctors(aToken);')
replace_in_file('frontend/src/pages/Admin/Doctors.jsx', 
    r'const \{ data \} = await axios\.post\(\s*`\$\{backendUrl\}/api/admin/change-availability`,\s*\{\s*docId\s*\},\s*\{\s*headers:\s*\{\s*atoken:\s*aToken\s*\}\s*,?\s*\}\s*,?\s*\);',
    r'const { data } = await changeAvailability({ docId }, aToken);')
replace_in_file('frontend/src/pages/Admin/Doctors.jsx', r'import axios from "axios";', r'import { getAllDoctors, changeAvailability } from "../../services/admin.service.js";')

# Doctor/Dashboard.jsx
replace_in_file('frontend/src/pages/Doctor/Dashboard.jsx', 
    r'const \{ data \} = await axios\.post\(\s*`\$\{backendUrl\}/api/doctor/complete-appointment`,\s*\{\s*appointmentId:\s*id\s*\},\s*\{\s*headers:\s*\{\s*dtoken:\s*dToken\s*\}\s*,?\s*\}\s*,?\s*\);',
    r'const { data } = await completeAppointment({ appointmentId: id }, dToken);')
replace_in_file('frontend/src/pages/Doctor/Dashboard.jsx', 
    r'const \{ data \} = await axios\.post\(\s*`\$\{backendUrl\}/api/doctor/cancel-appointment`,\s*\{\s*appointmentId:\s*id\s*\},\s*\{\s*headers:\s*\{\s*dtoken:\s*dToken\s*\}\s*,?\s*\}\s*,?\s*\);',
    r'const { data } = await cancelDoctorAppt({ appointmentId: id }, dToken);')
replace_in_file('frontend/src/pages/Doctor/Dashboard.jsx', r'import axios from "axios";', r'import { completeAppointment, cancelDoctorAppt } from "../../services/doctor.service.js";')

# Appointment.jsx
replace_in_file('frontend/src/pages/Appointment.jsx', 
    r'const \{ data \} = await axios\.post\(\s*`\$\{backendUrl\}/api/user/book-appointment`,\s*(\{.*?\})\s*,\s*\{\s*headers:\s*\{\s*token\s*\}\s*,?\s*\}\s*,?\s*\);',
    r'const { data } = await bookAppointment(\1, token);')
replace_in_file('frontend/src/pages/Appointment.jsx', r'import axios from "axios";', r'import { bookAppointment } from "../services/user.service.js";')

# 4. Fix app.js missing routes
app_js_path = 'backend/src/app.js'
with open(app_js_path, 'r', encoding='utf-8') as f:
    app_js = f.read()

if 'prescriptionRouter' not in app_js:
    imports = """import prescriptionRouter  from "./routes/prescription.routes.js"
import medicalRecordRouter from "./routes/medicalRecord.routes.js"
import reviewRouter        from "./routes/review.routes.js"
import notificationRouter  from "./routes/notification.routes.js"
"""
    routes = """app.use("/api/v1/prescriptions",    prescriptionRouter)
app.use("/api/v1/medical-records",  medicalRecordRouter)
app.use("/api/v1/reviews",          reviewRouter)
app.use("/api/v1/notifications",    notificationRouter)
"""
    app_js = app_js.replace('import adminRouter  from "./routes/admin.routes.js"', 'import adminRouter  from "./routes/admin.routes.js"\n' + imports)
    app_js = app_js.replace('app.use("/api/v1/admin",   adminRouter)', 'app.use("/api/v1/admin",   adminRouter)\n' + routes)
    
    with open(app_js_path, 'w', encoding='utf-8') as f:
        f.write(app_js)

# Rename the routes files if they were missed by my script
renames = [
    ('backend/src/routes/prescriptionRoute.js', 'backend/src/routes/prescription.routes.js'),
    ('backend/src/routes/medicalRecordRoute.js', 'backend/src/routes/medicalRecord.routes.js'),
    ('backend/src/routes/reviewRoute.js', 'backend/src/routes/review.routes.js'),
    ('backend/src/routes/notificationRoute.js', 'backend/src/routes/notification.routes.js'),
]
for old, new in renames:
    if os.path.exists(old):
        os.rename(old, new)


# 5. Fix doctor ownership check
doctor_controller = 'backend/src/controllers/doctor.controller.js'
replace_in_file(doctor_controller, r'appointmentData\.docId === docId', r'appointmentData.docId.toString() === docId.toString()')


# 6. Fix upload.middleware.js diskStorage -> memoryStorage
upload_middleware = 'backend/src/middlewares/upload.middleware.js'
if os.path.exists(upload_middleware):
    with open(upload_middleware, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('multer.diskStorage(', 'multer.memoryStorage(')
    # the destination and filename properties inside diskStorage will be ignored or cause error for memoryStorage if not removed
    # but memoryStorage() takes no arguments usually, so let's just replace the whole block
    c = re.sub(r'const storage = multer\.diskStorage\(\{.*\}\);', 'const storage = multer.memoryStorage();', c, flags=re.DOTALL)
    # also remove any remaining diskStorage properties just in case
    with open(upload_middleware, 'w', encoding='utf-8') as f:
        f.write(c)

# 8. Fix authAdmin, authDoctor, authUser imports in route files
replace_in_file('backend/src/routes/admin.routes.js', r'import authAdmin from', 'import { authAdmin } from')
replace_in_file('backend/src/routes/user.routes.js', r'import authUser from', 'import { authUser } from')
replace_in_file('backend/src/routes/doctor.routes.js', r'import authDoctor from', 'import { authDoctor } from')

print("All fixes applied!")
