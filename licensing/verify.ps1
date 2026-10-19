param([Parameter(Mandatory=$true)][string]$CodeFile)
$ErrorActionPreference = 'Stop'
try {
  $code = (Get-Content -LiteralPath $CodeFile -Raw).Trim()
  $parts = $code.Split('.')
  if ($parts.Length -ne 3 -or $parts[0] -ne 'CB1') { exit 1 }
  $payload = [Convert]::FromBase64String($parts[1])
  $signature = [Convert]::FromBase64String($parts[2])
  $rsa = New-Object Security.Cryptography.RSACryptoServiceProvider
  $rsa.FromXmlString((Get-Content -LiteralPath (Join-Path $PSScriptRoot 'public.xml') -Raw))
  if (-not $rsa.VerifyData($payload, [Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256'), $signature)) { exit 1 }
  $value = [Text.Encoding]::UTF8.GetString($payload) | ConvertFrom-Json
  if ($value.app -ne 'chatterbox' -or $value.v -ne 1 -or $value.name -isnot [string] -or -not $value.name.Trim() -or $value.name.Length -gt 60 -or $value.id -cnotmatch '^[0-9a-f-]{36}$') { exit 1 }
  $rsa.Dispose()
  exit 0
} catch { exit 1 }
