param([Parameter(Mandatory=$true)][string]$ExportDirectory)
$ErrorActionPreference = 'Stop'
$exportRoot = (Resolve-Path -LiteralPath $ExportDirectory).Path
$manifest = Get-Content -LiteralPath (Join-Path $exportRoot '导出清单.json') -Raw -Encoding utf8 | ConvertFrom-Json
$health = Invoke-RestMethod 'http://127.0.0.1:6131/api/v1/health' -NoProxy -TimeoutSec 10
if (-not $health.ready) { throw '请先在 TraceMemo 中连接微信数据库。' }
$taskToken = $env:TRACEMEMO_API_TOKEN
if (-not $taskToken) { $taskToken = [Environment]::GetEnvironmentVariable('TRACEMEMO_API_TOKEN', 'User') }
if (-not $taskToken) { $taskToken = $env:WECHATEXPLORER_API_TOKEN }
if (-not $taskToken) { $taskToken = [Environment]::GetEnvironmentVariable('WECHATEXPLORER_API_TOKEN', 'User') }
if (-not $taskToken) { throw '请配置 TRACEMEMO_API_TOKEN 环境变量。' }
$response = Invoke-RestMethod 'http://127.0.0.1:6131/api/v1/contact' -Headers @{Authorization="Bearer $taskToken"} -NoProxy -TimeoutSec 30
$manifestIds = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($conversation in $manifest.conversations) { [void]$manifestIds.Add([string]$conversation.id) }
$accounts = [ordered]@{}
foreach ($contact in $response.contacts) {
    $id = [string]$contact.md5
    if (-not $manifestIds.Contains($id)) { continue }
    $username = [string]$contact.m_nsUsrName
    if ($contact.isOfficialAccount -eq $true -or $username.StartsWith('gh_', [StringComparison]::Ordinal)) { $kind = 'official' }
    elseif ($username.EndsWith('@openim', [StringComparison]::Ordinal) -or $contact.type -in @('enterprise','work','openim')) { $kind = 'enterprise' }
    elseif ($contact.type -eq 'group') { $kind = 'group' }
    elseif ($contact.type -eq 'user') { $kind = 'personal' }
    else { continue }
    $accounts[$id] = $kind
}
if ($accounts.Count -eq 0) { throw '当前数据库与导出目录没有匹配的会话 ID，未写入分类文件。' }
$outputPath = Join-Path $exportRoot '联系人分类.json'
@{version=1; source='TraceMemo contact API'; accounts=$accounts} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $outputPath -Encoding utf8
# Only print counts, never contact details or credentials.
[pscustomobject]@{
    matched=$accounts.Count
    total=$manifestIds.Count
    official=@($accounts.Values | Where-Object { $_ -eq 'official' }).Count
    enterprise=@($accounts.Values | Where-Object { $_ -eq 'enterprise' }).Count
    output=$outputPath
} | ConvertTo-Json
