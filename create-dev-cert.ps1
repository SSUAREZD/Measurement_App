param(
  [string]$IpAddress = ""
)

$ErrorActionPreference = "Stop"

$mkcert = Get-Command mkcert -ErrorAction SilentlyContinue

if (-not $mkcert) {
  throw "mkcert no esta instalado o no esta en PATH."
}

if ([string]::IsNullOrWhiteSpace($IpAddress)) {
  $ipconfigOutput = ipconfig
  $ipAddress = $ipconfigOutput |
    Select-String 'IPv4 Address|Dirección IPv4' |
    ForEach-Object {
      if ($_.Line -match ':\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)') {
        $matches[1]
      }
    } |
    Where-Object {
      $_ -and $_ -notlike '127.*' -and $_ -notlike '169.254.*'
    } |
    Select-Object -First 1
}

if ([string]::IsNullOrWhiteSpace($IpAddress)) {
  throw "No se pudo detectar una IPv4 activa. Conectate a la Wi-Fi y vuelve a intentar."
}

$certDir = Join-Path $PSScriptRoot "certs"

if (-not (Test-Path $certDir)) {
  New-Item -ItemType Directory -Path $certDir | Out-Null
}

$certFile = Join-Path $certDir "lan-cert.pem"
$keyFile = Join-Path $certDir "lan-key.pem"

& $mkcert.Source -cert-file $certFile -key-file $keyFile localhost 127.0.0.1 ::1 $IpAddress

Write-Host ""
Write-Host "Certificado generado correctamente:" -ForegroundColor Green
Write-Host "  Cert: $certFile"
Write-Host "  Key : $keyFile"
Write-Host ""
Write-Host "IP incluida en el certificado: $IpAddress"
Write-Host "Si tu IP cambia, vuelve a ejecutar este script con la nueva IP."
