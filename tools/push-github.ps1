# Pushes the whole project to GitHub as one commit, without needing git installed.
# Uses the GitHub REST API. The token comes from $env:GITHUB_TOKEN, or from the file
# %USERPROFILE%\.garage-legends-token (kept outside the project so it's never uploaded).
#   powershell -ExecutionPolicy Bypass -File tools\push-github.ps1 -Message "What changed"
param([string]$Message = 'Update', [string]$Repo = 'garage-legends')
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = Split-Path $PSScriptRoot -Parent
$token = $env:GITHUB_TOKEN
if (-not $token) { $token = (Get-Content "$env:USERPROFILE\.garage-legends-token" -Raw).Trim() }
$h = @{ Authorization = "Bearer $token"; Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28' }
$api = 'https://api.github.com'
$json = 'application/json'

$user = (Invoke-RestMethod "$api/user" -Headers $h).login
try {
  $info = Invoke-RestMethod "$api/repos/$user/$Repo" -Headers $h
} catch {
  # new private repo with a first commit, so the Git Data API has a branch to build on
  $body = @{ name = $Repo; private = $true; auto_init = $true; description = 'Garage Legends: cozy idle + drag-racing browser game (Phaser 4)' } | ConvertTo-Json
  $null = Invoke-RestMethod "$api/user/repos" -Method Post -Headers $h -Body $body -ContentType $json
  Start-Sleep -Seconds 3
  $info = Invoke-RestMethod "$api/repos/$user/$Repo" -Headers $h
}
$branch = $info.default_branch
$parent = (Invoke-RestMethod "$api/repos/$user/$Repo/git/ref/heads/$branch" -Headers $h).object.sha

# the tree is a full snapshot of the folder, so deleted files disappear from the repo too
$tree = @()
foreach ($f in Get-ChildItem $root -Recurse -File) {
  $rel = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($f.FullName))
  $blob = Invoke-RestMethod "$api/repos/$user/$Repo/git/blobs" -Method Post -Headers $h -ContentType $json -Body (@{ content = $b64; encoding = 'base64' } | ConvertTo-Json)
  $tree += @{ path = $rel; mode = '100644'; type = 'blob'; sha = $blob.sha }
}
$treeSha = (Invoke-RestMethod "$api/repos/$user/$Repo/git/trees" -Method Post -Headers $h -ContentType $json -Body (@{ tree = $tree } | ConvertTo-Json -Depth 5)).sha
$commit = Invoke-RestMethod "$api/repos/$user/$Repo/git/commits" -Method Post -Headers $h -ContentType $json -Body (@{ message = $Message; tree = $treeSha; parents = @($parent) } | ConvertTo-Json)
$null = Invoke-RestMethod "$api/repos/$user/$Repo/git/refs/heads/$branch" -Method Patch -Headers $h -ContentType $json -Body (@{ sha = $commit.sha } | ConvertTo-Json)
"Pushed $($tree.Count) files to https://github.com/$user/$Repo ($branch) as $($commit.sha.Substring(0, 7))"
