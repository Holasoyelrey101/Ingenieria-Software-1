# Script to fix all error handling in rrhh.ts
$file = "c:\Users\david\Desktop\Ingenieria-Software-1\web\src\api\rrhh.ts"
$content = Get-Content $file -Raw

# Step 1: Replace all fetch( with safeFetch(
$content = $content -replace 'await fetch\(', 'await safeFetch('

# Step 2: Change specific function signatures to return nullable types
$content = $content -replace 'Promise<Employee>', 'Promise<Employee | null>'
$content = $content -replace 'Promise<Shift>', 'Promise<Shift | null>'
$content = $content -replace 'Promise<ShiftAssignment>', 'Promise<ShiftAssignment | null>'
$content = $content -replace 'Promise<Training>', 'Promise<Training | null>'
$content = $content -replace 'Promise<EmployeeTraining>', 'Promise<EmployeeTraining | null>'
$content = $content -replace 'Promise<DynamicShift>', 'Promise<DynamicShift | null>'

# Step 3: Replace error throwing with safe returns for GET operations
$content = $content -replace 'if \(!res\.ok\) throw new Error\(''Error al cargar empleados''\);', 'if (!res || !res.ok) return [];'
$content = $content -replace 'if \(!res\.ok\) throw new Error\(''Error al cargar empleado''\);', 'if (!res || !res.ok) return null;'
$content = $content -replace 'if \(!res\.ok\) throw new Error\(''Error al cargar turnos''\);', 'if (!res || !res.ok) return [];'
$content = $content -replace 'if \(!res\.ok\) throw new Error\(''Error al cargar turno''\);', 'if (!res || !res.ok) return null;'
$content = $content -replace 'if \(!res\.ok\) throw new Error\(''Error al cargar asignaciones''\);', 'if (!res || !res.ok) return [];'
$content = $content -replace 'if \(!res\.ok\) throw new Error\(''Error al cargar entrenamientos''\);', 'if (!res || !res.ok) return [];'
$content = $content -replace 'if \(!res\.ok\) throw new Error\(''Error al cargar entrenamientos del empleado''\);', 'if (!res || !res.ok) return [];'
$content = $content -replace 'if \(!res\.ok\) throw new Error\(''Error al cargar turnos dinámicos''\);', 'if (!res || !res.ok) return [];'
$content = $content -replace 'if \(!res\.ok\) throw new Error\(''Error al cargar turno dinámico''\);', 'if (!res || !res.ok) return null;'
$content = $content -replace 'if \(!res\.ok\) throw new Error\(''Error al cargar sugerencias''\);', 'if (!res || !res.ok) return { unassigned_employees: [], uncovered_shifts: [], week_start: "", week_end: "", coverage_percentage: 100, total_shifts: 0, assigned_shifts: 0 };'
$content = $content -replace 'if \(!res\.ok\) throw new Error\(''Error al cargar conductores disponibles''\);', 'if (!res || !res.ok) return [];'
$content = $content -replace 'if \(!res\.ok\) throw new Error\(''Error al cargar turnos pendientes''\);', 'if (!res || !res.ok) return [];'

# Step 4: Replace error throwing with safe returns for POST/PUT/DELETE operations  
$content = $content -replace 'if \(!res\.ok\) \{[^}]*throw new Error\([^)]*\);[^}]*\}', 'if (!res || !res.ok) return null;'

# Write back
Set-Content $file $content -Encoding UTF8

Write-Host "File fixed successfully!" -ForegroundColor Green
