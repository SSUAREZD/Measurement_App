param(
  [string]$IpAddress = "192.168.78.104"
)

$ErrorActionPreference = "Stop"

$mkcert = Get-Command mkcert -ErrorAction SilentlyContinue

if (-not $mkcert) {
  throw "mkcert no esta instalado o no esta en PATH."
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
