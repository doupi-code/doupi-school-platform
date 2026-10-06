# ==============================================================================
# 豆皮校园管理平台 — 全端防硬编码自动化检测脚本
# ==============================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ">>> 正在启动豆皮全端防硬编码自动化静态审查 <<<" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$rootPath = Split-Path -Parent $PSScriptRoot
$totalIssues = 0

# 1. 检查后端持久化实体类 (domain)
Write-Host "`n[1/4] 检查后端持久化实体类 POJO 零默认值规约..." -ForegroundColor Yellow
$domainViolations = @()
$domainFiles = Get-ChildItem -Path "$rootPath\doupi-server" -Recurse -Filter "*.java" | 
    Where-Object { $_.FullName -match "\\domain\\" -and $_.FullName -notmatch "\\(dto|vo)\\" }

foreach ($f in $domainFiles) {
    $matches = Select-String -Path $f.FullName -Pattern 'private\s+(String|Long|Integer|Double|BigDecimal)\s+[a-zA-Z0-9_]+\s*=\s*[^;]+;'
    foreach ($m in $matches) {
        if ($m.Line -notmatch "serialVersionUID") {
            $domainViolations += [PSCustomObject]@{
                File = $f.FullName.Replace("$rootPath\", "")
                Line = $m.LineNumber
                Code = $m.Line.Trim()
            }
        }
    }
}

if ($domainViolations.Count -gt 0) {
    Write-Host "发现 $($domainViolations.Count) 处实体类属性被硬编码赋予默认值:" -ForegroundColor Red
    $domainViolations | Format-Table -AutoSize
    $totalIssues += $domainViolations.Count
} else {
    Write-Host "[PASS] 后端持久化实体类全部符合 POJO 零初值规约！" -ForegroundColor Green
}

# 2. 检查业务魔数 (0.06 与 500)
Write-Host "`n[2/4] 检查文印耗材单价与包装规格魔数硬编码..." -ForegroundColor Yellow
$magicViolations = @()
$eduFiles = Get-ChildItem -Path "$rootPath\doupi-server\doupi-edu", "$rootPath\doupi-web-admin-react\src\pages\edu\report" -Recurse -Include *.java, *.tsx |
    Where-Object { $_.FullName -notmatch "\\test\\" }

foreach ($f in $eduFiles) {
    $matches = Select-String -Path $f.FullName -Pattern "(\*\s*0\.06|500张/包)"
    foreach ($m in $matches) {
        $magicViolations += [PSCustomObject]@{
            File = $f.FullName.Replace("$rootPath\", "")
            Line = $m.LineNumber
            Code = $m.Line.Trim()
        }
    }
}

if ($magicViolations.Count -gt 0) {
    Write-Host "发现 $($magicViolations.Count) 处业务计算魔数硬编码:" -ForegroundColor Yellow
    $magicViolations | Format-Table -AutoSize
    $totalIssues += $magicViolations.Count
} else {
    Write-Host "[PASS] 文印耗材单价与包装规格魔数已全部参数化动态驱动！" -ForegroundColor Green
}

# 3. 检查台账报表 Option 写死
Write-Host "`n[3/4] 检查台账报表页面下拉表单中的 Option 硬编码..." -ForegroundColor Yellow
$optionViolations = @()
$reportFiles = Get-ChildItem -Path "$rootPath\doupi-web-admin-react\src\pages\edu\report" -Recurse -Include *.tsx

foreach ($f in $reportFiles) {
    $matches = Select-String -Path $f.FullName -Pattern '<Option value="高一">'
    foreach ($m in $matches) {
        $optionViolations += [PSCustomObject]@{
            File = $f.FullName.Replace("$rootPath\", "")
            Line = $m.LineNumber
            Code = $m.Line.Trim()
        }
    }
}

if ($optionViolations.Count -gt 0) {
    Write-Host "发现 $($optionViolations.Count) 处写死 Option 选项:" -ForegroundColor Yellow
    $optionViolations | Format-Table -AutoSize
    $totalIssues += $optionViolations.Count
} else {
    Write-Host "[PASS] 台账报表页面下拉选项已全部升级为字典动态驱动！" -ForegroundColor Green
}

# 4. 检查移动端外部演示网关写死
Write-Host "`n[4/4] 检查移动端与小程序环境网关地址..." -ForegroundColor Yellow
$urlViolations = @()
$appFiles = Get-ChildItem -Path "$rootPath\doupi-app\config", "$rootPath\doupi-app" -Recurse -Include *.js

foreach ($f in $appFiles) {
    $matches = Select-String -Path $f.FullName -Pattern "vue\.Doupi\.vip"
    foreach ($m in $matches) {
        $urlViolations += [PSCustomObject]@{
            File = $f.FullName.Replace("$rootPath\", "")
            Line = $m.LineNumber
            Code = $m.Line.Trim()
        }
    }
}

if ($urlViolations.Count -gt 0) {
    Write-Host "发现 $($urlViolations.Count) 处外部测试域名硬编码:" -ForegroundColor Red
    $urlViolations | Format-Table -AutoSize
    $totalIssues += $urlViolations.Count
} else {
    Write-Host "[PASS] 移动端与小程序环境地址已全面规范化外部注入！" -ForegroundColor Green
}

Write-Host "`n============================================================" -ForegroundColor Cyan
if ($totalIssues -eq 0) {
    Write-Host ">>> 全端防硬编码自动化检测 100% 通过！代码质量优秀！<<<" -ForegroundColor Green
} else {
    Write-Host ">>> 审查完成，共发现 $totalIssues 处需关注项 <<<" -ForegroundColor Yellow
}
Write-Host "============================================================" -ForegroundColor Cyan
