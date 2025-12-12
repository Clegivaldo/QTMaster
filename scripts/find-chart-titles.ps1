$lines = Get-Content 'preview.html'
for ($i=0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'Temp' -or $lines[$i] -match 'Umid' -or $lines[$i] -match 'Variação de Temperatura' -or $lines[$i] -match 'Variação de Umidade') {
    $start = [Math]::Max(0, $i-3)
    $end = [Math]::Min($lines.Count-1, $i+3)
    Write-Host "=== MATCH at line $($i+1) ==="
    for ($j=$start; $j -le $end; $j++) { Write-Host ("{0}: {1}" -f ($j+1), $lines[$j]) }
    Write-Host "---"
  }
}
