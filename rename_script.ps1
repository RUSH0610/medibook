$renames = @{
    "backend/src/controllers/userController.js" = "backend/src/controllers/user.controller.js"
    "backend/src/controllers/doctorController.js" = "backend/src/controllers/doctor.controller.js"
    "backend/src/controllers/adminController.js" = "backend/src/controllers/admin.controller.js"
    "backend/src/models/userModel.js" = "backend/src/models/user.model.js"
    "backend/src/models/doctorModel.js" = "backend/src/models/doctor.model.js"
    "backend/src/models/appointmentModel.js" = "backend/src/models/appointment.model.js"
    "backend/src/models/prescriptionModel.js" = "backend/src/models/prescription.model.js"
    "backend/src/routes/userRoute.js" = "backend/src/routes/user.routes.js"
    "backend/src/routes/doctorRoute.js" = "backend/src/routes/doctor.routes.js"
    "backend/src/routes/adminRoute.js" = "backend/src/routes/admin.routes.js"
    "backend/src/config/mongodb.js" = "backend/src/config/db.js"
    "backend/src/middlewares/multer.js" = "backend/src/middlewares/upload.middleware.js"
}

# Rename files
foreach ($old in $renames.Keys) {
    if (Test-Path $old) {
        Rename-Item -Path $old -NewName ($renames[$old] | Split-Path -Leaf) -Force
    }
}

# Replacement map for strings inside files
$replacements = @{
    "userController.js" = "user.controller.js"
    "doctorController.js" = "doctor.controller.js"
    "adminController.js" = "admin.controller.js"
    "userModel.js" = "user.model.js"
    "doctorModel.js" = "doctor.model.js"
    "appointmentModel.js" = "appointment.model.js"
    "prescriptionModel.js" = "prescription.model.js"
    "userRoute.js" = "user.routes.js"
    "doctorRoute.js" = "doctor.routes.js"
    "adminRoute.js" = "admin.routes.js"
    "mongodb.js" = "db.js"
    "multer.js" = "upload.middleware.js"
    "authUser.js" = "auth.middleware.js"
    "authDoctor.js" = "auth.middleware.js"
    "authAdmin.js" = "auth.middleware.js"
}

# Target specific folders to avoid node_modules
$folders = @("backend/src/controllers", "backend/src/models", "backend/src/routes", "backend/src/middlewares", "backend/src/config", "backend/src/utils")
$files = @("backend/server.js", "backend/src/app.js")

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        $files += (Get-ChildItem -Path $folder -Filter "*.js" -File).FullName
    }
}

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $changed = $false
        
        foreach ($old in $replacements.Keys) {
            if ($content -match $old) {
                $content = $content -replace $old, $replacements[$old]
                $changed = $true
            }
        }
        
        if ($changed) {
            Set-Content -Path $file -Value $content -NoNewline
        }
    }
}
