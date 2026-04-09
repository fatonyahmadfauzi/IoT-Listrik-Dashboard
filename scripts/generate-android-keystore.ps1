param(
  [string]$Alias = "fatony",
  [string]$KeystoreDir = "android-app/keystore",
  [string]$KeystoreFile = "release-keystore.jks",
  # If provided, store/key passwords will use this value (free self-signed).
  [Alias("Password")]
  [string]$KeystoreSecret
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$keystorePath = Join-Path (Join-Path $repoRoot $KeystoreDir) $KeystoreFile
$propsPath = Join-Path (Join-Path $repoRoot $KeystoreDir) "keystore.properties"

if (-not (Test-Path $KeystoreDir)) {
  New-Item -ItemType Directory -Force -Path (Join-Path $repoRoot $KeystoreDir) | Out-Null
}

$keytoolCmd = Get-Command keytool -ErrorAction SilentlyContinue
$keytoolExe = $null

if ($keytoolCmd) {
  $keytoolExe = $keytoolCmd.Source
} else {
  # Fallback: some Windows installs don't expose keytool in PATH.
  $candidateRoots = @()
  if ($env:JAVA_HOME) {
    $candidateRoots += $env:JAVA_HOME
  }
  $candidateRoots += "C:\Program Files\Java"

  foreach ($root in $candidateRoots | Sort-Object -Unique) {
    if (-not (Test-Path $root)) { continue }

    # check root\bin\keytool.exe first
    $direct = Join-Path $root "bin\keytool.exe"
    if (Test-Path $direct) {
      $keytoolExe = $direct
      break
    }

    # check root\*\bin\keytool.exe (one level)
    if ($root -eq "C:\Program Files\Java") {
      $javas = Get-ChildItem $root -Directory -ErrorAction SilentlyContinue
      foreach ($j in $javas) {
        $p = Join-Path $j.FullName "bin\keytool.exe"
        if (Test-Path $p) {
          $keytoolExe = $p
          break
        }
      }
    }

    if ($keytoolExe) { break }
  }
}

if (-not $keytoolExe) {
  throw "keytool tidak ditemukan. Pastikan JDK/JRE sudah terpasang."
}

Write-Host "Membuat Android keystore (self-signed) untuk signing release."
Write-Host "Subject (CN) akan diset: Fatony Ahmad Fauzi"

if ([string]::IsNullOrWhiteSpace($KeystoreSecret)) {
  $storePasswordSecure = Read-Host "Store password" -AsSecureString
  $keyPasswordSecure = Read-Host "Key password" -AsSecureString
} else {
  $storePasswordSecure = ConvertTo-SecureString -String $KeystoreSecret -AsPlainText -Force
  $keyPasswordSecure = ConvertTo-SecureString -String $KeystoreSecret -AsPlainText -Force
}

function ConvertTo-PlainText([securestring]$secure) {
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$storePassword = ConvertTo-PlainText $storePasswordSecure
$keyPassword = ConvertTo-PlainText $keyPasswordSecure

$dname = "CN=Fatony Ahmad Fauzi, OU=IoT Listrik Dashboard, O=IoT Listrik, L=Jakarta, S=Jakarta, C=ID"

if (Test-Path $keystorePath) {
  Write-Host "Keystore sudah ada di: $keystorePath"
  Write-Host "Akan ditimpa (hapus file lama)."
  Remove-Item -Force $keystorePath
}

& $keytoolExe `
  -genkeypair -v `
  -keystore $keystorePath `
  -alias $Alias `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -storepass $storePassword `
  -keypass $keyPassword `
  -dname $dname

@"
storeFile=$KeystoreFile
storePassword=$storePassword
keyAlias=$Alias
keyPassword=$keyPassword
"@ | Set-Content -Path $propsPath -Encoding ascii

Write-Host ""
Write-Host "Selesai."
Write-Host "Keystore: $keystorePath"
Write-Host "Keystore properties: $propsPath"
Write-Host "Jangan commit file properties ini ke git (sudah di-ignore)."

