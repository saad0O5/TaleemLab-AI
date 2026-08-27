Get-NetTCPConnection -LocalPort 3000,3001 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort,OwningProcess | Format-Table
foreach ($p in 3000,3001) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:$p/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Output "port $p health: $($r.Content)"
  } catch {
    Write-Output "port $p health FAILED: $($_.Exception.Message)"
  }
}
