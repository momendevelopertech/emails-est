param(
    [string]$DatabaseUrl = 'postgresql://neondb_owner:npg_bMFwTj1aKAh8@ep-misty-mode-am72hie8-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    [string]$ApiBaseUrl = 'http://localhost:3001/api',
    [string]$LoginIdentifier = 'superadmin@sphinx.com',
    [string]$LoginPassword = 'Admin@123456',
    [string]$EmailRecipient = 'sphinx.publishing.company@zohomail.com',
    [string]$WhatsAppPhone = '01012345678'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$emailExamType = "codex-email-$timestamp"
$selectedExamType = "codex-selected-$timestamp"
$whatsAppExamType = "codex-whatsapp-$timestamp"
$emailTemplateName = "Codex Email Test $timestamp"
$whatsAppTemplateName = "Codex WhatsApp Test $timestamp"

function Wait-ApiReady {
    param([string]$Url)

    for ($i = 0; $i -lt 30; $i++) {
        try {
            $null = Invoke-RestMethod -Uri $Url -TimeoutSec 5
            return
        } catch {
            Start-Sleep -Seconds 2
        }
    }

    throw "API did not become ready at $Url"
}

function Invoke-JsonPost {
    param(
        [string]$Uri,
        [object]$Body,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        [string]$CsrfToken,
        [int]$TimeoutSec = 30
    )

    return Invoke-RestMethod `
        -Method Post `
        -Uri $Uri `
        -WebSession $Session `
        -DisableKeepAlive `
        -Headers @{ 'X-CSRF-Token' = $CsrfToken } `
        -Body ($Body | ConvertTo-Json -Depth 10) `
        -ContentType 'application/json' `
        -TimeoutSec $TimeoutSec
}

function Cleanup-TestData {
    param(
        [string]$DbUrl,
        [string[]]$ExamTypes,
        [string[]]$TemplateNames
    )

    $env:DATABASE_URL = $DbUrl
    $serializedExamTypes = $ExamTypes | ConvertTo-Json -Compress
    $serializedTemplateNames = $TemplateNames | ConvertTo-Json -Compress

    @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const examTypes = $serializedExamTypes;
const templateNames = $serializedTemplateNames;

(async () => {
  await prisma.`$transaction(async (tx) => {
    const recipients = await tx.recipient.findMany({
      where: { exam_type: { in: examTypes } },
      select: { id: true },
    });

    const ids = recipients.map((item) => item.id);
    if (ids.length) {
      await tx.log.deleteMany({ where: { recipientId: { in: ids } } });
      await tx.recipient.deleteMany({ where: { id: { in: ids } } });
    }

    await tx.template.deleteMany({
      where: { name: { in: templateNames } },
    });
  });

  await prisma.`$disconnect();
})().catch(async (error) => {
  console.error(error);
  await prisma.`$disconnect();
  process.exit(1);
});
"@ | node - | Out-Null
}

$apiJob = Start-Job -ArgumentList $repoRoot, $DatabaseUrl -ScriptBlock {
    param($Root, $DbUrl)
    Set-Location $Root
    $env:DATABASE_URL = $DbUrl
    npm.cmd --prefix apps/api run start
}

try {
    Wait-ApiReady -Url $ApiBaseUrl

    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $csrf = Invoke-RestMethod -Uri "$ApiBaseUrl/auth/csrf" -WebSession $session -DisableKeepAlive -TimeoutSec 15
    $login = Invoke-JsonPost -Uri "$ApiBaseUrl/auth/login" -Body @{
        identifier = $LoginIdentifier
        password = $LoginPassword
    } -Session $session -CsrfToken $csrf.csrfToken -TimeoutSec 20

    $me = Invoke-RestMethod -Uri "$ApiBaseUrl/auth/me" -WebSession $session -DisableKeepAlive -TimeoutSec 15

    $emailTemplate = Invoke-JsonPost -Uri "$ApiBaseUrl/messaging/templates" -Body @{
        name = $emailTemplateName
        type = 'EMAIL'
        subject = 'Codex email for {{name}}'
        body = 'Hello {{name}}, this is a local integration test.'
    } -Session $session -CsrfToken $csrf.csrfToken -TimeoutSec 20

    $emailImport = Invoke-JsonPost -Uri "$ApiBaseUrl/messaging/recipients/import" -Body @{
        recipients = @(
            @{
                name = 'Codex Email Recipient'
                email = $EmailRecipient
                exam_type = $emailExamType
                date = '2026-04-10'
                arrival_time = '10:00'
                room = 'A1'
            }
        )
    } -Session $session -CsrfToken $csrf.csrfToken -TimeoutSec 20

    $selectedImport = Invoke-JsonPost -Uri "$ApiBaseUrl/messaging/recipients/import" -Body @{
        recipients = @(
            @{
                name = 'Codex Selected Recipient'
                email = 'selected.flow.test@example.com'
                exam_type = $selectedExamType
                date = '2026-04-10'
                arrival_time = '10:15'
                room = 'A2'
            }
        )
    } -Session $session -CsrfToken $csrf.csrfToken -TimeoutSec 20

    $emailSend = Invoke-JsonPost -Uri "$ApiBaseUrl/messaging/send" -Body @{
        templateId = $emailTemplate.id
        mode = 'filtered'
        filter = @{
            exam_type = $emailExamType
            status = 'PENDING'
        }
    } -Session $session -CsrfToken $csrf.csrfToken -TimeoutSec 120

    $selectedRecipientLookup = Invoke-RestMethod -Uri "$ApiBaseUrl/messaging/recipients?page=1&limit=10&exam_type=$selectedExamType" -WebSession $session -DisableKeepAlive -TimeoutSec 20
    $selectedRecipientId = $selectedRecipientLookup.items[0].id

    $selectedSend = Invoke-JsonPost -Uri "$ApiBaseUrl/messaging/send" -Body @{
        templateId = $emailTemplate.id
        mode = 'selected'
        ids = @($selectedRecipientId)
    } -Session $session -CsrfToken $csrf.csrfToken -TimeoutSec 120

    $whatsAppTemplate = Invoke-JsonPost -Uri "$ApiBaseUrl/messaging/templates" -Body @{
        name = $whatsAppTemplateName
        type = 'WHATSAPP'
        subject = 'Codex WhatsApp'
        body = 'Hello {{name}}, this is a local WhatsApp integration test.'
    } -Session $session -CsrfToken $csrf.csrfToken -TimeoutSec 20

    $whatsAppImport = Invoke-JsonPost -Uri "$ApiBaseUrl/messaging/recipients/import" -Body @{
        recipients = @(
            @{
                name = 'Codex WhatsApp Recipient'
                phone = $WhatsAppPhone
                exam_type = $whatsAppExamType
                date = '2026-04-10'
                arrival_time = '10:30'
                room = 'B2'
            }
        )
    } -Session $session -CsrfToken $csrf.csrfToken -TimeoutSec 20

    $whatsAppSend = Invoke-JsonPost -Uri "$ApiBaseUrl/messaging/send" -Body @{
        templateId = $whatsAppTemplate.id
        mode = 'filtered'
        filter = @{
            exam_type = $whatsAppExamType
            status = 'PENDING'
        }
    } -Session $session -CsrfToken $csrf.csrfToken -TimeoutSec 120

    $logs = Invoke-RestMethod -Uri "$ApiBaseUrl/messaging/logs?limit=10" -WebSession $session -DisableKeepAlive -TimeoutSec 20

    [pscustomobject]@{
        loginUser = $login.user.email
        meUser = $me.email
        emailTemplateId = $emailTemplate.id
        emailImported = $emailImport.imported
        selectedImported = $selectedImport.imported
        emailSendProcessed = $emailSend.processed
        emailSendFailed = $emailSend.failed
        emailSendResult = ($emailSend.results | Select-Object -First 1 | ConvertTo-Json -Compress)
        selectedRecipientId = $selectedRecipientId
        selectedSendProcessed = $selectedSend.processed
        selectedSendFailed = $selectedSend.failed
        selectedSendResult = ($selectedSend.results | Select-Object -First 1 | ConvertTo-Json -Compress)
        whatsAppTemplateId = $whatsAppTemplate.id
        whatsAppImported = $whatsAppImport.imported
        whatsAppSendProcessed = $whatsAppSend.processed
        whatsAppSendFailed = $whatsAppSend.failed
        whatsAppSendResult = ($whatsAppSend.results | Select-Object -First 1 | ConvertTo-Json -Compress)
        latestLogStatuses = ($logs.items | Select-Object -First 5 | ForEach-Object { $_.status }) -join ','
    } | ConvertTo-Json -Depth 10
}
finally {
    Cleanup-TestData `
        -DbUrl $DatabaseUrl `
        -ExamTypes @($emailExamType, $selectedExamType, $whatsAppExamType) `
        -TemplateNames @($emailTemplateName, $whatsAppTemplateName)

    Stop-Job -Job $apiJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job -Job $apiJob -Force -ErrorAction SilentlyContinue | Out-Null
}
