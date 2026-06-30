$replacements = @{
    '\bbtn-primary\b' = 'bg-primary text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm'
    '\bbtn-outline\b' = 'border border-primary text-primary px-5 py-2 rounded-lg hover:bg-primary hover:text-white transition-colors font-medium text-sm'
    '\bcard\b' = 'bg-white rounded-2xl shadow-sm border border-gray-100/50 p-6'
    '\binput-field\b' = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all'
    '\bbadge\b' = 'text-xs px-2.5 py-1 rounded-full font-medium'
    '\bsidebar-link\b' = 'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer'
}

$files = Get-ChildItem -Path "frontend-practice\src" -Filter "*.jsx" -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $changed = $false
    
    foreach ($key in $replacements.Keys) {
        if ($content -match $key) {
            # Only replacing within classNames or template literals loosely
            $content = [regex]::Replace($content, $key, $replacements[$key])
            $changed = $true
        }
    }
    
    if ($changed) {
        Set-Content -Path $file.FullName -Value $content
    }
}
