$ErrorActionPreference = "Stop"

$codes = @(
  "01395", "01203",
  "01101", "01102", "01103", "01104", "01105", "01106", "01107", "01108", "01109", "01110",
  "01481", "01204", "01454", "01458", "01457", "01229",
  "03214", "03301", "03206",
  "06201", "15461", "15217", "20485", "20563", "20561"
)

$output = Join-Path $PSScriptRoot "boundary-source"
New-Item -ItemType Directory -Force -Path $output | Out-Null

foreach ($code in $codes) {
  $url = "https://geoshape.ex.nii.ac.jp/city/geojson/latest/$code.geojson"
  $destination = Join-Path $output "$code.geojson"
  Invoke-WebRequest -Uri $url -OutFile $destination
}

Write-Output "Downloaded $($codes.Count) municipal boundary files to $output"
