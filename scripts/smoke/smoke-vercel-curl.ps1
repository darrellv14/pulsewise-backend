param(
  [string]$BaseUrl = "https://pulsewise-backend.vercel.app/api/v1",
  [string]$DoctorEmail = "doctor@pulsewise.local",
  [string]$DoctorPassword = "dev12345",
  [string]$PatientEmail = "seed.patient2@pulsewise.local",
  [string]$PatientPassword = "dev12345"
)

$ErrorActionPreference = "Stop"

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    [string]$Token = "",
    [object]$Body = $null
  )

  $url = "$BaseUrl$Path"
  $tmpBody = [System.IO.Path]::GetTempFileName()

  $args = @(
    "-sS",
    "-X", $Method,
    $url,
    "-H", "Accept: application/json",
    "-o", $tmpBody,
    "-w", "%{http_code}"
  )

  $tmpRequest = $null

  if (-not [string]::IsNullOrWhiteSpace($Token)) {
    $args += @("-H", "Authorization: Bearer $Token")
  }

  if ($null -ne $Body) {
    $jsonBody = $Body | ConvertTo-Json -Depth 20 -Compress
    $tmpRequest = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tmpRequest -Value $jsonBody -NoNewline
    $args += @("-H", "Content-Type: application/json", "--data-binary", "@$tmpRequest")
  }

  $statusRaw = & curl.exe @args
  $status = 0
  [void][int]::TryParse("$statusRaw", [ref]$status)

  $rawBody = Get-Content -Path $tmpBody -Raw
  Remove-Item -Path $tmpBody -Force
  if ($null -ne $tmpRequest -and (Test-Path $tmpRequest)) {
    Remove-Item -Path $tmpRequest -Force
  }

  $json = $null
  try {
    $json = $rawBody | ConvertFrom-Json
  } catch {
    $json = $null
  }

  return [PSCustomObject]@{
    Method = $Method
    Path = $Path
    Url = $url
    Status = $status
    RawBody = $rawBody
    Json = $json
  }
}

function Test-Step {
  param(
    [string]$Name,
    [object]$Result,
    [int[]]$ExpectedStatuses
  )

  $ok = $ExpectedStatuses -contains $Result.Status
  $statusLabel = if ($ok) { "PASS" } else { "FAIL" }
  $bodyPreview = ($Result.RawBody -replace "\s+", " ")
  if ($bodyPreview.Length -gt 160) {
    $bodyPreview = $bodyPreview.Substring(0, 160) + "..."
  }

  Write-Host "[$statusLabel] $Name => $($Result.Status) [$($Result.Method) $($Result.Path)]"
  if (-not $ok) {
    Write-Host "       body: $bodyPreview"
  }

  return [PSCustomObject]@{
    Name = $Name
    Ok = $ok
    Status = $Result.Status
  }
}

function Get-NestedValue {
  param(
    [object]$Object,
    [string[]]$Path
  )

  $current = $Object
  foreach ($segment in $Path) {
    if ($null -eq $current) {
      return $null
    }

    if ($current -is [System.Collections.IDictionary]) {
      if (-not $current.Contains($segment)) {
        return $null
      }
      $current = $current[$segment]
      continue
    }

    $prop = $current.PSObject.Properties[$segment]
    if ($null -eq $prop) {
      return $null
    }
    $current = $prop.Value
  }

  return $current
}

$results = @()

Write-Host "=== PulseWise Smoke (curl) ==="
Write-Host "Base URL: $BaseUrl"

$health = Invoke-Api -Method "GET" -Path "/health"
$results += Test-Step -Name "Health" -Result $health -ExpectedStatuses @(200)

$doctorLogin = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
  email = $DoctorEmail
  password = $DoctorPassword
}
$results += Test-Step -Name "Doctor Login" -Result $doctorLogin -ExpectedStatuses @(200)

$patientLogin = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
  email = $PatientEmail
  password = $PatientPassword
}
$results += Test-Step -Name "Patient Login" -Result $patientLogin -ExpectedStatuses @(200)

$doctorToken = Get-NestedValue -Object $doctorLogin.Json -Path @('data', 'token')
$doctorId = Get-NestedValue -Object $doctorLogin.Json -Path @('data', 'user', 'userId')
$patientToken = Get-NestedValue -Object $patientLogin.Json -Path @('data', 'token')
$patientId = Get-NestedValue -Object $patientLogin.Json -Path @('data', 'user', 'userId')

if ([string]::IsNullOrWhiteSpace($doctorToken) -or [string]::IsNullOrWhiteSpace($doctorId)) {
  Write-Host "Doctor token/userId tidak tersedia. Hentikan test lanjutan."
  exit 1
}

if ([string]::IsNullOrWhiteSpace($patientToken) -or [string]::IsNullOrWhiteSpace($patientId)) {
  Write-Host "Patient token/userId tidak tersedia. Hentikan test lanjutan."
  exit 1
}

$doctorMe = Invoke-Api -Method "GET" -Path "/auth/me" -Token $doctorToken
$results += Test-Step -Name "Doctor Auth Me" -Result $doctorMe -ExpectedStatuses @(200)

$patientMe = Invoke-Api -Method "GET" -Path "/auth/me" -Token $patientToken
$results += Test-Step -Name "Patient Auth Me" -Result $patientMe -ExpectedStatuses @(200)

$doctorPatients = Invoke-Api -Method "GET" -Path "/doctors/$doctorId/patients?page=1&limit=20" -Token $doctorToken
$results += Test-Step -Name "Doctor Patients List" -Result $doctorPatients -ExpectedStatuses @(200)

$dashboardPatients = Invoke-Api -Method "GET" -Path "/doctors/$doctorId/dashboard/patients?page=1&limit=20" -Token $doctorToken
$results += Test-Step -Name "Doctor Dashboard Patients" -Result $dashboardPatients -ExpectedStatuses @(200)

$historyBefore = Invoke-Api -Method "GET" -Path "/biometrics?page=1&limit=5" -Token $patientToken
$results += Test-Step -Name "Patient Biometrics History" -Result $historyBefore -ExpectedStatuses @(200)

$ingest = Invoke-Api -Method "POST" -Path "/biometrics" -Token $patientToken -Body @{
  source = "smoke_script"
  readings = @(
    @{
      metricType = "heart_rate"
      valueNumeric = 77
      unit = "bpm"
      measuredAt = [DateTime]::UtcNow.ToString("o")
    }
  )
}
$results += Test-Step -Name "Patient Ingest Biometrics" -Result $ingest -ExpectedStatuses @(200, 201)

$pairingCreate = Invoke-Api -Method "POST" -Path "/doctors/$doctorId/dashboard/pairing-sessions" -Token $doctorToken -Body @{
  expiresInSeconds = 90
}
$results += Test-Step -Name "Create Pairing Session" -Result $pairingCreate -ExpectedStatuses @(201)

$pairingSessionId = Get-NestedValue -Object $pairingCreate.Json -Path @('data', 'pairingSessionId')
$pairingToken = Get-NestedValue -Object $pairingCreate.Json -Path @('data', 'pairingToken')
if (-not [string]::IsNullOrWhiteSpace($pairingSessionId)) {
  $pairingStatus = Invoke-Api -Method "GET" -Path "/doctors/$doctorId/dashboard/pairing-sessions/$pairingSessionId" -Token $doctorToken
  $results += Test-Step -Name "Pairing Session Status" -Result $pairingStatus -ExpectedStatuses @(200)
}

if (-not [string]::IsNullOrWhiteSpace($pairingToken)) {
  $pairingConfirm = Invoke-Api -Method "POST" -Path "/dashboard/pairing-sessions/confirm" -Token $patientToken -Body @{
    pairingToken = $pairingToken
    source = "qr_dashboard_pairing"
  }
  $results += Test-Step -Name "Confirm Pairing" -Result $pairingConfirm -ExpectedStatuses @(200, 201)
}

$failed = @($results | Where-Object { -not $_.Ok })
$passed = @($results | Where-Object { $_.Ok })

Write-Host ""
Write-Host "=== Summary ==="
Write-Host "Passed: $($passed.Count)"
Write-Host "Failed: $($failed.Count)"

if ($failed.Count -gt 0) {
  Write-Host "Failed steps:"
  $failed | ForEach-Object { Write-Host "- $($_.Name) (status: $($_.Status))" }
  exit 1
}

Write-Host "Semua smoke check PASS."
