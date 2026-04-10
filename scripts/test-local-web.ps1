param(
    [string]$ApiUrl = 'http://localhost:3001/api',
    [string]$WebBaseUrl = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

function Wait-HttpReady {
    param(
        [string]$Url,
        [int]$Attempts = 30
    )

    for ($i = 0; $i -lt $Attempts; $i++) {
        try {
            $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            return
        } catch {
            Start-Sleep -Seconds 2
        }
    }

    throw "URL did not become ready: $Url"
}

$apiJob = Start-Job -ScriptBlock {
    Set-Location 'e:\emails-est\apps\api'
    npm.cmd run start
}

$webJob = Start-Job -ArgumentList $repoRoot, $ApiUrl -ScriptBlock {
    param($Root, $ResolvedApiUrl)
    Set-Location (Join-Path $Root 'apps\web')
    $env:API_URL = $ResolvedApiUrl
    $env:NEXT_PUBLIC_API_URL = $ResolvedApiUrl
    npm.cmd run dev
}

try {
    Wait-HttpReady -Url $ApiUrl -Attempts 30
    Wait-HttpReady -Url "$WebBaseUrl/ar/login" -Attempts 45

    $proxySession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $csrfViaWeb = Invoke-RestMethod -Uri "$WebBaseUrl/api/auth/csrf" -WebSession $proxySession -DisableKeepAlive -TimeoutSec 15

    $apiSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $csrfViaApi = Invoke-RestMethod -Uri "$ApiUrl/auth/csrf" -WebSession $apiSession -DisableKeepAlive -TimeoutSec 15
    $loginViaApi = Invoke-RestMethod `
        -Method Post `
        -Uri "$ApiUrl/auth/login" `
        -WebSession $apiSession `
        -DisableKeepAlive `
        -Headers @{ 'X-CSRF-Token' = $csrfViaApi.csrfToken } `
        -Body (@{ identifier = 'superadmin@sphinx.com'; password = 'Admin@123456' } | ConvertTo-Json) `
        -ContentType 'application/json' `
        -TimeoutSec 20
    $meViaApi = Invoke-RestMethod -Uri "$ApiUrl/auth/me" -WebSession $apiSession -DisableKeepAlive -TimeoutSec 15
    $loginPage = Invoke-WebRequest -Uri "$WebBaseUrl/ar/login" -UseBasicParsing -TimeoutSec 15
    $workspaceRecipientsPage = Invoke-WebRequest -Uri "$WebBaseUrl/ar/messaging?tab=recipients" -UseBasicParsing -TimeoutSec 15
    $workspaceTemplatesPage = Invoke-WebRequest -Uri "$WebBaseUrl/ar/messaging?tab=templates" -UseBasicParsing -TimeoutSec 15

    [pscustomobject]@{
        csrfViaWeb = [bool]$csrfViaWeb.csrfToken
        csrfViaApi = [bool]$csrfViaApi.csrfToken
        loginApiUser = $loginViaApi.user.email
        meApiUser = $meViaApi.email
        loginStatus = $loginPage.StatusCode
        loginHasTitle = ($loginPage.Content -match 'login' -or $loginPage.Content -match 'تسجيل')
        recipientsWorkspaceStatus = $workspaceRecipientsPage.StatusCode
        templatesWorkspaceStatus = $workspaceTemplatesPage.StatusCode
        recipientsWorkspaceHasShell = ($workspaceRecipientsPage.Content -match 'Messaging' -or $workspaceRecipientsPage.Content -match 'messaging')
    } | ConvertTo-Json
}
finally {
    Stop-Job -Job $webJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job -Job $webJob -Force -ErrorAction SilentlyContinue | Out-Null
    Stop-Job -Job $apiJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job -Job $apiJob -Force -ErrorAction SilentlyContinue | Out-Null
}
