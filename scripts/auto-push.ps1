# يرفع أي تعديلات غير محفوظة إلى GitHub تلقائياً (commit + push على الفرع الحالي).
# يُستدعى من hook في .claude/settings.json بعد انتهاء كل رد من Claude.
# لا يفعل شيئاً إذا لم تكن هناك تعديلات، ولا يفشل أبداً حتى لا يعطّل العمل.

$ErrorActionPreference = 'Stop'
try {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
    Set-Location (Split-Path -Parent $PSScriptRoot)

    if (-not (git rev-parse --is-inside-work-tree 2>$null)) { exit 0 }

    $changes = git status --porcelain
    if (-not $changes) { exit 0 }

    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'

    git add -A | Out-Null
    git -c core.safecrlf=false commit -q -m "Auto-save $stamp" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" | Out-Null
    git push -q origin $branch 2>&1 | Out-Null
} catch {
    # نتجاهل الأخطاء (لا إنترنت، تعارض…) ويبقى الـ commit محلياً ويُدفع في المرة التالية.
}
exit 0
