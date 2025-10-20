Param(
    [switch]$SkipInstall,
    [switch]$UseGlobalPnpm,
    [switch]$SkipBuildWeb,
    [switch]$SkipBuildUI
)

function Write-Log($msg){
    $t = Get-Date -Format "HH:mm:ss"
    Write-Host "[$t] $msg"
}

Push-Location -Path (Split-Path -Path $MyInvocation.MyCommand.Path -Parent)
# Ensure we run from repo root (system/youngro)
Set-Location ..\

# Prepare pnpm
if (-not $UseGlobalPnpm) {
    Write-Log "Enabling corepack and preparing pnpm (may download pnpm)..."
    try {
        corepack enable
        corepack prepare pnpm@latest --activate
    } catch {
        Write-Log "corepack prepare failed: $_"
        Write-Log "You can try '-UseGlobalPnpm' to skip corepack and use a globally installed pnpm or run 'npm install -g pnpm'"
        Pop-Location
        exit 1
    }
} else {
    Write-Log "Skipping corepack; using global pnpm"
}

# Verify pnpm
try {
    $pv = pnpm -v
    Write-Log "pnpm version: $pv"
} catch {
    Write-Log "pnpm not found or error: $_"
    Pop-Location
    exit 1
}

# Install deps
if (-not $SkipInstall) {
    Write-Log "Installing dependencies (pnpm install --frozen-lockfile)..."
    $code = & pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
        Write-Log "pnpm install failed with exit code $LASTEXITCODE"
        Pop-Location
        exit $LASTEXITCODE
    }
} else {
    Write-Log "Skipping install as requested"
}

# Lint (if exists) - try with --if-present, fallback if action script rejects args
Write-Log "Running lint (attempt pnpm -w lint -- --if-present, fallback to pnpm -w lint)"
try {
    & pnpm -w lint -- --if-present
} catch {
    Write-Log "lint with -- --if-present failed, trying without: $_"
    try {
        & pnpm -w lint
    } catch {
        Write-Log "lint failed or not present: $_. Continuing"
    }
}

# Build UI first to ensure types/exports are available for other packages' typecheck
if (-not $SkipBuildUI) {
    Write-Log "Building UI package (pnpm -w -F @repo/ui build:ui)"
    & pnpm -w -F @repo/ui build:ui
    if ($LASTEXITCODE -ne 0) {
        Write-Log "UI build failed with exit code $LASTEXITCODE"
        Pop-Location
        exit $LASTEXITCODE
    }
} else {
    Write-Log "Skipping UI build as requested"
}

# Typecheck UI (and other packages)
Write-Log "Typechecking workspace packages (pnpm -w -F @repo/ui check-types)"
& pnpm -w -F @repo/ui check-types
if ($LASTEXITCODE -ne 0) {
    Write-Log "Typecheck failed with exit code $LASTEXITCODE"
    Pop-Location
    exit $LASTEXITCODE
}

# Build UI
if (-not $SkipBuildUI) {
    Write-Log "Building UI package (pnpm -w -F @repo/ui build:ui)"
    & pnpm -w -F @repo/ui build:ui
    if ($LASTEXITCODE -ne 0) {
        Write-Log "UI build failed with exit code $LASTEXITCODE"
        Pop-Location
        exit $LASTEXITCODE
    }
} else {
    Write-Log "Skipping UI build as requested"
}

# Build web
if (-not $SkipBuildWeb) {
    Write-Log "Building web app (pnpm -w -F web build)"
    & pnpm -w -F web build
    if ($LASTEXITCODE -ne 0) {
        Write-Log "web build failed with exit code $LASTEXITCODE"
        Pop-Location
        exit $LASTEXITCODE
    }
} else {
    Write-Log "Skipping web build as requested"
}

Write-Log "Local CI script finished successfully"
Pop-Location
return 0
