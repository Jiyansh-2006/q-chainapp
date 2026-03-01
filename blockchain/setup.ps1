Write-Host "🚀 ====================================" -ForegroundColor Cyan
Write-Host "🚀 QToken Blockchain Setup" -ForegroundColor Cyan
Write-Host "🚀 ====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
    Write-Host "   Trying with --legacy-peer-deps..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
    
    # Check if .env exists
    if (-Not (Test-Path ".env")) {
        Write-Host ""
        Write-Host "📄 Creating .env file from template..." -ForegroundColor Yellow
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-Host "✅ Created .env file" -ForegroundColor Green
            Write-Host "   Please edit .env and add your values" -ForegroundColor Yellow
        } else {
            Write-Host "⚠️  .env.example not found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ .env file already exists" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "🔨 Compiling contracts..." -ForegroundColor Yellow
    npm run compile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Contracts compiled successfully!" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🎉 Setup complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Next steps:" -ForegroundColor Cyan
        Write-Host "1. Start local blockchain: npm run node" -ForegroundColor White
        Write-Host "2. Deploy contract: npm run deploy" -ForegroundColor White
        Write-Host "3. Update frontend config with contract address" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ Contract compilation failed!" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
}