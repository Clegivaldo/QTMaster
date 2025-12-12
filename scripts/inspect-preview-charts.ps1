$lines = Get-Content 'preview.html'
$matches = Select-String -InputObject $lines -Pattern '<img' -AllMatches
$cnt=0
foreach ($m in $matches) {
  $ln = $m.LineNumber
  $start = [Math]::Max(1,$ln-3)
  $end = [Math]::Min($lines.Count,$ln+3)
  Write-Host "=== MATCH $($cnt) at line $ln ==="
  for ($i=$start; $i -le $end; $i++) { Write-Host ("{0}: {1}" -f $i, $lines[$i-1]) }
  $cnt++
  if ($cnt -ge 6) { break }
}
