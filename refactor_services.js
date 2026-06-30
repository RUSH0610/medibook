const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend/src');

const replacements = [
    // User routes
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/user\/login`\s*,\s*({[\s\S]*?})\s*\)/g, replace: "loginUser($1)" },
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/user\/register`\s*,\s*({[\s\S]*?})\s*\)/g, replace: "registerUser($1)" },
    { regex: /axios\.get\(\s*`\$\{backendUrl\}\/api\/user\/get-profile`\s*,\s*\{\s*headers:\s*\{\s*token\s*\}\s*\}\s*\)/g, replace: "getUserProfile(token)" },
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/user\/update-profile`\s*,\s*formData\s*,\s*\{\s*headers:\s*\{\s*token\s*\}\s*\}\s*\)/g, replace: "updateUserProfile(formData, token)" },
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/user\/book-appointment`\s*,\s*({[\s\S]*?})\s*,\s*\{\s*headers:\s*\{\s*token\s*\}\s*\}\s*\)/g, replace: "bookAppointment($1, token)" },
    { regex: /axios\.get\(\s*`\$\{backendUrl\}\/api\/user\/appointments`\s*,\s*\{\s*headers:\s*\{\s*token\s*\}\s*\}\s*\)/g, replace: "listAppointments(token)" },
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/user\/cancel-appointment`\s*,\s*({[\s\S]*?})\s*,\s*\{\s*headers:\s*\{\s*token\s*\}\s*\}\s*\)/g, replace: "cancelAppointment($1, token)" },

    // Doctor routes
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/doctor\/login`\s*,\s*({[\s\S]*?})\s*\)/g, replace: "loginDoctor($1)" },
    { regex: /axios\.get\(\s*`\$\{backendUrl\}\/api\/doctor\/list`\s*\)/g, replace: "getDoctors()" },
    { regex: /axios\.get\(\s*`\$\{backendUrl\}\/api\/doctor\/profile`\s*,\s*\{\s*headers:\s*\{\s*dtoken\s*\}\s*\}\s*\)/g, replace: "getDoctorProfile(dtoken)" },
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/doctor\/update-profile`\s*,\s*({[\s\S]*?})\s*,\s*\{\s*headers:\s*\{\s*dtoken\s*\}\s*\}\s*\)/g, replace: "updateDoctorProfile($1, dtoken)" },
    { regex: /axios\.get\(\s*`\$\{backendUrl\}\/api\/doctor\/dashboard`\s*,\s*\{\s*headers:\s*\{\s*dtoken\s*\}\s*\}\s*\)/g, replace: "getDoctorDashboard(dtoken)" },
    { regex: /axios\.get\(\s*`\$\{backendUrl\}\/api\/doctor\/appointments`\s*,\s*\{\s*headers:\s*\{\s*dtoken\s*\}\s*\}\s*\)/g, replace: "getDoctorAppointments(dtoken)" },
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/doctor\/complete-appointment`\s*,\s*({[\s\S]*?})\s*,\s*\{\s*headers:\s*\{\s*dtoken\s*\}\s*\}\s*\)/g, replace: "completeAppointment($1, dtoken)" },
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/doctor\/cancel-appointment`\s*,\s*({[\s\S]*?})\s*,\s*\{\s*headers:\s*\{\s*dtoken\s*\}\s*\}\s*\)/g, replace: "cancelDoctorAppt($1, dtoken)" },

    // Admin routes
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/admin\/login`\s*,\s*({[\s\S]*?})\s*\)/g, replace: "loginAdmin($1)" },
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/admin\/add-doctor`\s*,\s*formData\s*,\s*\{\s*headers:\s*\{\s*atoken\s*\}\s*\}\s*\)/g, replace: "addDoctor(formData, atoken)" },
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/admin\/all-doctors`\s*,\s*\{\s*headers:\s*\{\s*atoken\s*\}\s*\}\s*\)/g, replace: "getAllDoctors(atoken)" },
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/admin\/change-availability`\s*,\s*({[\s\S]*?})\s*,\s*\{\s*headers:\s*\{\s*atoken\s*\}\s*\}\s*\)/g, replace: "changeAvailability($1, atoken)" },
    { regex: /axios\.get\(\s*`\$\{backendUrl\}\/api\/admin\/dashboard`\s*,\s*\{\s*headers:\s*\{\s*atoken\s*\}\s*\}\s*\)/g, replace: "getAdminDashboard(atoken)" },
    { regex: /axios\.get\(\s*`\$\{backendUrl\}\/api\/admin\/appointments`\s*,\s*\{\s*headers:\s*\{\s*atoken\s*\}\s*\}\s*\)/g, replace: "getAdminAppointments(atoken)" },
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/admin\/cancel-appointment`\s*,\s*({[\s\S]*?})\s*,\s*\{\s*headers:\s*\{\s*atoken\s*\}\s*\}\s*\)/g, replace: "cancelAdminAppt($1, atoken)" },
    
    // Other missing ones in AppContext or Navbar
    // Sometimes there are no brackets for an empty object: getAllDoctors
    { regex: /axios\.post\(\s*`\$\{backendUrl\}\/api\/admin\/all-doctors`\s*,\s*\{\s*\}\s*,\s*\{\s*headers:\s*\{\s*atoken\s*\}\s*\}\s*\)/g, replace: "getAllDoctors(atoken)" },
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            // Apply replacements
            for (const rep of replacements) {
                content = content.replace(rep.regex, rep.replace);
            }
            
            // If anything changed
            if (content !== original) {
                // Remove axios import
                content = content.replace(/import axios from "axios";\n?/g, '');
                
                // Generate new imports
                const usedUser = [];
                const usedDoctor = [];
                const usedAdmin = [];
                
                const userFuncs = ['loginUser', 'registerUser', 'getUserProfile', 'updateUserProfile', 'bookAppointment', 'listAppointments', 'cancelAppointment'];
                const doctorFuncs = ['loginDoctor', 'getDoctors', 'getDoctorProfile', 'updateDoctorProfile', 'getDoctorDashboard', 'getDoctorAppointments', 'completeAppointment', 'cancelDoctorAppt'];
                const adminFuncs = ['loginAdmin', 'addDoctor', 'getAllDoctors', 'changeAvailability', 'getAdminDashboard', 'getAdminAppointments', 'cancelAdminAppt'];
                
                for (const f of userFuncs) if (content.includes(f + '(')) usedUser.push(f);
                for (const f of doctorFuncs) if (content.includes(f + '(')) usedDoctor.push(f);
                for (const f of adminFuncs) if (content.includes(f + '(')) usedAdmin.push(f);
                
                const depth = fullPath.split('src\\')[1].split('\\').length - 1;
                const relPath = depth === 0 ? './services' : '../'.repeat(depth) + 'services';
                
                let newImports = '';
                if (usedUser.length > 0) newImports += `import { ${usedUser.join(', ')} } from "${relPath}/user.service.js";\n`;
                if (usedDoctor.length > 0) newImports += `import { ${usedDoctor.join(', ')} } from "${relPath}/doctor.service.js";\n`;
                if (usedAdmin.length > 0) newImports += `import { ${usedAdmin.join(', ')} } from "${relPath}/admin.service.js";\n`;
                
                if (newImports) {
                    const parts = content.split('\n');
                    let lastImport = -1;
                    for (let i = 0; i < parts.length; i++) {
                        if (parts[i].startsWith('import ')) lastImport = i;
                    }
                    if (lastImport !== -1) {
                        parts.splice(lastImport + 1, 0, newImports);
                        content = parts.join('\n');
                    } else {
                        content = newImports + '\n' + content;
                    }
                }
                
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDirectory(directoryPath);
