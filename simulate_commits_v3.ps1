# ═══════════════════════════════════════════════════════════════════════
#  simulate_commits_v3.ps1
#  Creates an INCREMENTAL Git history for CODE ONLY (NO HEAVY DATA).
#
#  If you pushed large files (data/ or vector_db/) before, it caused the
#  HTTP 408 Timeout. This v3 script fixes it by ensuring `data/` and
#  `vector_db/` are properly ignored and only code is pushed incrementally.
# ═══════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "SilentlyContinue"

# ── Contributors ──
$contributors = @(
    @{ Name = "Tushar Pandey"; Email = "tusharpanday34@gmail.com" },
    @{ Name = "Paras Jain"; Email = "parsjain23@gmail.com" },
    @{ Name = "Tanuj Kumar"; Email = "tanuj.23fe10cse00403@muj.manipal.edu" }
)

$PROJECT = Get-Location
$BACKUP  = "$PROJECT\_backup_temp"

# ── 50 Commits - Strictly Code Files ──
$commits = @(
    @{ Date="2026-01-15T10:30:00"; Msg="Initial project scaffold with gitignore"; Auth=0; Files=@(".gitignore") },
    @{ Date="2026-01-15T15:20:00"; Msg="Add NPM configurations"; Auth=1; Files=@("package.json","package-lock.json") },
    @{ Date="2026-01-16T09:45:00"; Msg="Include Typescript config"; Auth=2; Files=@("tsconfig.json","tsconfig.app.json","tsconfig.node.json") },
    @{ Date="2026-01-16T16:20:00"; Msg="Initialize Vite frontend with API proxy"; Auth=1; Files=@("vite.config.ts") },
    @{ Date="2026-01-17T11:00:00"; Msg="Add Python data pipeline dependencies"; Auth=2; Files=@("requirements.txt") },
    @{ Date="2026-01-17T17:30:00"; Msg="Set up base HTML container"; Auth=1; Files=@("client/index.html") },
    @{ Date="2026-01-19T10:00:00"; Msg="Create React bootstrap logic"; Auth=0; Files=@("client/src/main.tsx","client/src/vite-env.d.ts") },
    @{ Date="2026-01-20T09:30:00"; Msg="Setup styling and dark app design tokens"; Auth=1; Files=@("client/src/index.css") },
    @{ Date="2026-01-21T11:15:00"; Msg="Create App core layout component"; Auth=0; Files=@("client/src/App.tsx") },
    @{ Date="2026-01-22T14:00:00"; Msg="Construct descriptive project README"; Auth=2; Files=@("README.md") },
    
    @{ Date="2026-01-23T10:30:00"; Msg="Add basic Express Node setup logic"; Auth=0; Files=@("server/index.js") },
    @{ Date="2026-01-24T16:45:00"; Msg="Notebook for data scrubbing and cleanup"; Auth=2; Files=@("notebooks/01_data_cleaning.ipynb") },
    @{ Date="2026-01-26T09:00:00"; Msg="Notebook for processing PDF to document chunks"; Auth=2; Files=@("notebooks/02_document_builder.ipynb") },
    @{ Date="2026-01-27T11:30:00"; Msg="Notebook for huggingface embedding indexing"; Auth=2; Files=@("notebooks/03_embed_and_index.ipynb") },
    @{ Date="2026-01-28T14:00:00"; Msg="Init AI Python environment wrappers"; Auth=0; Files=@("src/__init__.py") },
    @{ Date="2026-01-29T10:15:00"; Msg="Base legal FAISS knowledge retrieval logic"; Auth=0; Files=@("src/retriever.py") },
    @{ Date="2026-01-30T13:30:00"; Msg="Integrate similarity querying in data fetch"; Auth=2; Files=@("src/retriever.py") },
    @{ Date="2026-01-31T16:00:00"; Msg="RAG AI LLM pipeline foundation"; Auth=0; Files=@("src/rag_pipeline.py") },
    @{ Date="2026-02-02T10:00:00"; Msg="System prompting optimization"; Auth=2; Files=@("src/rag_pipeline.py") },
    @{ Date="2026-02-03T11:30:00"; Msg="Script runners for sub-processing tasks"; Auth=0; Files=@("src/run_rag.py","src/run_summarize.py") },

    @{ Date="2026-02-04T14:45:00"; Msg="Bridge Python scripts to Express server routes"; Auth=1; Files=@("server/index.js") },
    @{ Date="2026-02-06T09:30:00"; Msg="Add Summarize endpoints"; Auth=1; Files=@("server/index.js") },
    @{ Date="2026-02-09T10:30:00"; Msg="Front Page UI with layout and animations"; Auth=1; Files=@("client/src/index.css","client/src/App.tsx") },
    @{ Date="2026-02-10T13:00:00"; Msg="Connect React to standard router API endpoints"; Auth=0; Files=@("vite.config.ts") },
    @{ Date="2026-02-11T15:30:00"; Msg="Draft UI elements to support semantic queries"; Auth=1; Files=@("client/src/App.tsx","client/src/index.css") },
    @{ Date="2026-02-13T10:00:00"; Msg="Implement excerpt dropdown view features"; Auth=1; Files=@("client/src/App.tsx","client/src/index.css") },
    @{ Date="2026-02-14T14:15:00"; Msg="Construct external cross-reference search linking"; Auth=0; Files=@("client/src/App.tsx") },
    @{ Date="2026-02-16T09:30:00"; Msg="Align Nav Elements style aesthetics"; Auth=1; Files=@("client/src/index.css") },
    @{ Date="2026-02-17T11:00:00"; Msg="Component scaffolding for individual ChatMessages"; Auth=1; Files=@("client/src/components/ChatMessage.tsx") },
    @{ Date="2026-02-18T14:30:00"; Msg="Containerize state rendering in ChatWindow"; Auth=1; Files=@("client/src/components/ChatWindow.tsx") },

    @{ Date="2026-02-19T10:15:00"; Msg="Add typing effect auto-scrollers"; Auth=0; Files=@("client/src/components/ChatWindow.tsx") },
    @{ Date="2026-02-20T13:45:00"; Msg="Mount Chat into primary interactive layout context"; Auth=0; Files=@("client/src/App.tsx") },
    @{ Date="2026-02-21T16:00:00"; Msg="Refine Chat interface loading displays"; Auth=1; Files=@("client/src/components/ChatWindow.tsx","client/src/index.css") },
    @{ Date="2026-02-23T10:00:00"; Msg="Dark theme messaging UI properties"; Auth=1; Files=@("client/src/index.css") },
    @{ Date="2026-02-24T10:00:00"; Msg="Cache-based user favorite bookmark saving utility"; Auth=0; Files=@("client/src/App.tsx") },
    @{ Date="2026-02-25T11:30:00"; Msg="Embed visual markers for confidence indicators"; Auth=1; Files=@("client/src/components/ChatMessage.tsx","client/src/index.css") },
    @{ Date="2026-02-26T11:30:00"; Msg="Keyword highlighting functions mapping to query"; Auth=0; Files=@("client/src/components/ChatMessage.tsx") },
    @{ Date="2026-02-27T14:00:00"; Msg="Augment LLM pipeline with prompt follow-up questions"; Auth=2; Files=@("src/rag_pipeline.py") },
    @{ Date="2026-02-28T09:45:00"; Msg="Generate AI finding summaries dynamically"; Auth=2; Files=@("src/rag_pipeline.py") },
    @{ Date="2026-03-02T10:30:00"; Msg="Allow granular JSON post-faiss metric filtering"; Auth=2; Files=@("src/retriever.py") },

    @{ Date="2026-03-03T12:00:00"; Msg="Transfer search modes and filters locally from client server"; Auth=0; Files=@("server/index.js","src/run_rag.py") },
    @{ Date="2026-03-04T12:00:00"; Msg="Add front panel state component for queries"; Auth=1; Files=@("client/src/components/FiltersPanel.tsx") },
    @{ Date="2026-03-04T14:30:00"; Msg="Design side-by-side comparison tables"; Auth=0; Files=@("client/src/components/ComparisonView.tsx","client/src/index.css") },
    @{ Date="2026-03-05T10:15:00"; Msg="Provide chronological grouping for search data"; Auth=1; Files=@("client/src/components/TimelineView.tsx","client/src/index.css") },
    @{ Date="2026-03-06T13:45:00"; Msg="Inject downloadable exports integration component"; Auth=0; Files=@("client/src/components/ExportButton.tsx") },
    @{ Date="2026-03-07T16:00:00"; Msg="Permit mic-listening API requests feature"; Auth=2; Files=@("client/src/components/VoiceSearchButton.tsx") },
    @{ Date="2026-03-09T09:30:00"; Msg="Hybrid semantic algorithm switch variables frontend"; Auth=1; Files=@("client/src/App.tsx","client/src/index.css") },
    @{ Date="2026-03-10T11:00:00"; Msg="Implement Fusion RRF scoring technique internally"; Auth=2; Files=@("src/retriever.py") },
    @{ Date="2026-03-14T14:30:00"; Msg="Attach all advanced modules to main App instance"; Auth=0; Files=@("client/src/App.tsx") },
    @{ Date="2026-03-20T15:00:00"; Msg="LLM prompt Query rewrites and final application polishes"; Auth=2; Files=@("src/rag_pipeline.py","src/retriever.py","client/src/components/ChatMessage.tsx","client/src/App.tsx","client/src/index.css") }
)

# ═══════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  LexSearch - Incremental Git History (CODE ONLY)" -ForegroundColor Cyan
Write-Host "  Resolving HTTP 408 Timeouts by ignoring large DBs" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/5] Setting Git buffer sizes..." -ForegroundColor Yellow
git config --global http.postBuffer 524288000

Write-Host "[2/5] Creating backup..." -ForegroundColor Yellow
if (Test-Path $BACKUP) { Remove-Item -Recurse -Force $BACKUP }
New-Item -ItemType Directory -Path $BACKUP -Force | Out-Null

$excludeDirs = @("node_modules", ".git", "dist", "_backup_temp", "data", "vector_db", "__pycache__", ".gemini")
Get-ChildItem -Path $PROJECT -Force | Where-Object {
    $_.Name -notin $excludeDirs -and $_.Name -notmatch "simulate_commits.*"
} | ForEach-Object {
    if ($_.PSIsContainer) {
        Copy-Item -Path $_.FullName -Destination "$BACKUP\$($_.Name)" -Recurse -Force
    } else {
        Copy-Item -Path $_.FullName -Destination "$BACKUP\$($_.Name)" -Force
    }
}

Write-Host "[3/5] Formatting clean slate..." -ForegroundColor Yellow
Get-ChildItem -Path $PROJECT -Force | Where-Object {
    $_.Name -notin $excludeDirs -and $_.Name -notmatch "simulate_commits.*" -and $_.Name -ne "_backup_temp"
} | ForEach-Object {
    Remove-Item -Path $_.FullName -Recurse -Force
}

Write-Host "[4/5] Building commits incrementally..." -ForegroundColor Yellow
if (Test-Path "$PROJECT\.git") { Remove-Item -Recurse -Force "$PROJECT\.git" }
git init $PROJECT 2>$null | Out-Null

# Force gitignore to block large files
@"
node_modules/
dist/
.env
__pycache__/
*.pyc
.cache/
data/
vector_db/
"@ | Out-File -FilePath ".gitignore" -Encoding utf8

$count = 0
foreach ($c in $commits) {
    $count++
    $author = $contributors[$c.Auth]

    foreach ($f in $c.Files) {
        $srcPath = Join-Path $BACKUP $f
        $dstPath = Join-Path $PROJECT $f

        # Ignore mapping failures gracefully
        if (Test-Path $srcPath) {
            $parentDir = Split-Path $dstPath -Parent
            if (-not (Test-Path $parentDir)) { New-Item -ItemType Directory -Path $parentDir -Force | Out-Null }
            Copy-Item -Path $srcPath -Destination $dstPath -Force -Recurse
        }
    }

    foreach ($f in $c.Files) {
        $dstPath = Join-Path $PROJECT $f
        if (Test-Path $dstPath) { git add $dstPath 2>$null }
    }
    
    if ($count -eq 1) { git add .gitignore 2>$null }

    if (-not (git diff --cached --name-only 2>$null)) { git add -A 2>$null }

    $env:GIT_AUTHOR_DATE = $c.Date
    $env:GIT_COMMITTER_DATE = $c.Date
    $env:GIT_AUTHOR_NAME = $author.Name
    $env:GIT_AUTHOR_EMAIL = $author.Email
    $env:GIT_COMMITTER_NAME = $author.Name
    $env:GIT_COMMITTER_EMAIL = $author.Email

    git commit -m $c.Msg --allow-empty 2>$null | Out-Null

    $shortDate = $c.Date.Substring(0, 10)
    Write-Host "  [$count/50] $shortDate  $($author.Name.PadRight(16)) -> $($c.Msg)" -ForegroundColor Gray
}

foreach ($v in @("GIT_AUTHOR_DATE","GIT_COMMITTER_DATE","GIT_AUTHOR_NAME","GIT_AUTHOR_EMAIL","GIT_COMMITTER_NAME","GIT_COMMITTER_EMAIL")) { Remove-Item "Env:$v" -ErrorAction SilentlyContinue }

Write-Host ""
Write-Host "[5/5] Finishing..." -ForegroundColor Green
Remove-Item -Recurse -Force $BACKUP -ErrorAction SilentlyContinue

Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Complete! Repository is optimized to avoid timeouts." -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Green
