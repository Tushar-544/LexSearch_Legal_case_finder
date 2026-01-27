# ═══════════════════════════════════════════════════════════════════════
#  simulate_commits_v2.ps1
#  Creates an INCREMENTAL Git history — files appear gradually.
#
#  HOW IT WORKS:
#    1. Backs up all project files to a temp folder
#    2. Clears the project directory
#    3. Initializes empty git repo
#    4. For each commit, copies ONLY the relevant files from backup
#    5. Stages and commits with backdated author/date
#
#  RUN:  powershell -ExecutionPolicy Bypass -File .\simulate_commits_v2.ps1
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

# ── 50 Commits: each commit lists files to copy from backup ──
$commits = @(
    # === WEEK 1-2: Project Setup & Data (Jan 15-24) ===
    @{ Date="2026-01-15T10:30:00"; Msg="Initial project scaffold with gitignore"; Auth=0;
       Files=@(".gitignore") },

    @{ Date="2026-01-15T15:20:00"; Msg="Add package.json and TypeScript config"; Auth=0;
       Files=@("package.json","tsconfig.json","tsconfig.app.json","tsconfig.node.json","package-lock.json") },

    @{ Date="2026-01-16T09:45:00"; Msg="Setup React client entry point and HTML"; Auth=1;
       Files=@("client/index.html","client/src/main.tsx") },

    @{ Date="2026-01-16T16:20:00"; Msg="Configure Vite with API proxy for development"; Auth=1;
       Files=@("vite.config.ts") },

    @{ Date="2026-01-17T11:00:00"; Msg="Add Python requirements for RAG pipeline"; Auth=2;
       Files=@("requirements.txt") },

    @{ Date="2026-01-17T17:30:00"; Msg="Add project README with setup instructions"; Auth=2;
       Files=@("README.md") },

    @{ Date="2026-01-19T10:00:00"; Msg="Add raw Supreme Court case dataset"; Auth=2;
       Files=@("data/raw/cases_raw.csv") },

    @{ Date="2026-01-20T09:30:00"; Msg="Create data cleaning notebook for preprocessing"; Auth=2;
       Files=@("notebooks/01_data_cleaning.ipynb") },

    @{ Date="2026-01-21T11:15:00"; Msg="Add cleaned and processed case data"; Auth=2;
       Files=@("data/processed/cases_clean.csv") },

    @{ Date="2026-01-22T14:00:00"; Msg="Build document chunking pipeline"; Auth=2;
       Files=@("notebooks/02_document_builder.ipynb") },

    @{ Date="2026-01-23T10:30:00"; Msg="Generate text chunks and documents for embedding"; Auth=2;
       Files=@("data/processed/chunks.jsonl","data/processed/documents.jsonl") },

    @{ Date="2026-01-24T16:45:00"; Msg="Create embedding generation and indexing notebook"; Auth=2;
       Files=@("notebooks/03_embed_and_index.ipynb") },

    # === WEEK 3-4: Vector Search & Backend (Jan 26-Feb 7) ===
    @{ Date="2026-01-26T09:00:00"; Msg="Build FAISS vector index from case embeddings"; Auth=2;
       Files=@("vector_db/index.faiss","vector_db/metadata.jsonl") },

    @{ Date="2026-01-27T11:30:00"; Msg="Implement FAISS retriever with semantic search"; Auth=0;
       Files=@("src/__init__.py","src/retriever.py") },

    @{ Date="2026-01-28T14:00:00"; Msg="Create RAG pipeline with HuggingFace LLM generation"; Auth=0;
       Files=@("src/rag_pipeline.py") },

    @{ Date="2026-01-29T10:15:00"; Msg="Add CLI runner for RAG pipeline queries"; Auth=0;
       Files=@("src/run_rag.py") },

    @{ Date="2026-01-30T13:30:00"; Msg="Add summarization CLI runner script"; Auth=0;
       Files=@("src/run_summarize.py") },

    @{ Date="2026-01-31T16:00:00"; Msg="Implement Express server with /api/search endpoint"; Auth=1;
       Files=@("server/index.js") },

    @{ Date="2026-02-02T10:00:00"; Msg="Add /api/summarize endpoint and health check"; Auth=1;
       Files=@("server/index.js") },

    @{ Date="2026-02-03T11:30:00"; Msg="Add error handling and logging to backend"; Auth=1;
       Files=@("server/index.js") },

    @{ Date="2026-02-04T14:45:00"; Msg="Configure concurrently dev scripts for full-stack"; Auth=0;
       Files=@("package.json") },

    @{ Date="2026-02-06T09:30:00"; Msg="Add PDF summary loading to retriever"; Auth=0;
       Files=@("src/retriever.py") },

    # === WEEK 5-6: Frontend UI & Chat (Feb 9-21) ===
    @{ Date="2026-02-09T10:30:00"; Msg="Create initial App component with search bar"; Auth=1;
       Files=@("client/src/App.tsx") },

    @{ Date="2026-02-10T13:00:00"; Msg="Add base CSS with dark theme and design system"; Auth=1;
       Files=@("client/src/index.css") },

    @{ Date="2026-02-11T15:30:00"; Msg="Build hero section, source cards, and responsive layout"; Auth=1;
       Files=@("client/src/App.tsx","client/src/index.css") },

    @{ Date="2026-02-13T10:00:00"; Msg="Add judgment excerpts and Indian Kanoon links"; Auth=1;
       Files=@("client/src/App.tsx","client/src/index.css") },

    @{ Date="2026-02-14T14:15:00"; Msg="Create ChatMessage component with user/AI bubbles"; Auth=0;
       Files=@("client/src/components/ChatMessage.tsx") },

    @{ Date="2026-02-16T09:30:00"; Msg="Create ChatWindow with auto-scroll and typing indicator"; Auth=0;
       Files=@("client/src/components/ChatWindow.tsx") },

    @{ Date="2026-02-17T11:00:00"; Msg="Integrate chat interface into main App"; Auth=0;
       Files=@("client/src/App.tsx") },

    @{ Date="2026-02-18T14:30:00"; Msg="Add chat bubble CSS with animations and dark theme"; Auth=1;
       Files=@("client/src/index.css") },

    @{ Date="2026-02-19T10:15:00"; Msg="Implement bookmark system with localStorage persistence"; Auth=0;
       Files=@("client/src/App.tsx","client/src/index.css") },

    @{ Date="2026-02-20T13:45:00"; Msg="Add confidence badges and keyword highlighting to cards"; Auth=1;
       Files=@("client/src/components/ChatMessage.tsx","client/src/index.css") },

    @{ Date="2026-02-21T16:00:00"; Msg="Polish navbar styling and responsive mobile layout"; Auth=1;
       Files=@("client/src/index.css") },

    # === WEEK 7-8: RAG Enhancements & Advanced Features (Feb 23-Mar 7) ===
    @{ Date="2026-02-23T10:00:00"; Msg="Add follow-up suggestion generation to RAG pipeline"; Auth=2;
       Files=@("src/rag_pipeline.py") },

    @{ Date="2026-02-25T11:30:00"; Msg="Add key takeaways extraction from AI answers"; Auth=2;
       Files=@("src/rag_pipeline.py") },

    @{ Date="2026-02-27T14:00:00"; Msg="Add post-FAISS filtering support for year, judge, score"; Auth=2;
       Files=@("src/retriever.py") },

    @{ Date="2026-02-28T09:45:00"; Msg="Update server and CLI to pass filters and search mode"; Auth=0;
       Files=@("server/index.js","src/run_rag.py") },

    @{ Date="2026-03-02T10:30:00"; Msg="Create FiltersPanel component with advanced controls"; Auth=1;
       Files=@("client/src/components/FiltersPanel.tsx","client/src/index.css") },

    @{ Date="2026-03-03T12:00:00"; Msg="Add case comparison view with side-by-side table"; Auth=0;
       Files=@("client/src/components/ComparisonView.tsx","client/src/index.css") },

    @{ Date="2026-03-04T14:30:00"; Msg="Create timeline visualization grouped by year"; Auth=0;
       Files=@("client/src/components/TimelineView.tsx","client/src/index.css") },

    @{ Date="2026-03-05T10:15:00"; Msg="Add JSON export button for search results"; Auth=1;
       Files=@("client/src/components/ExportButton.tsx") },

    @{ Date="2026-03-06T13:45:00"; Msg="Implement voice search with Web Speech API"; Auth=0;
       Files=@("client/src/components/VoiceSearchButton.tsx","client/src/index.css") },

    @{ Date="2026-03-07T16:00:00"; Msg="Add search mode toggle (semantic/keyword/hybrid)"; Auth=1;
       Files=@("client/src/App.tsx","client/src/index.css") },

    # === WEEK 9-10: Hybrid Search, Data Quality & Polish (Mar 9-20) ===
    @{ Date="2026-03-09T09:30:00"; Msg="Implement keyword search and hybrid RRF in retriever"; Auth=2;
       Files=@("src/retriever.py") },

    @{ Date="2026-03-10T11:00:00"; Msg="Integrate all advanced components into main App"; Auth=0;
       Files=@("client/src/App.tsx") },

    @{ Date="2026-03-14T14:30:00"; Msg="Add query rewriting for improved retrieval accuracy"; Auth=2;
       Files=@("src/rag_pipeline.py") },

    @{ Date="2026-03-16T10:00:00"; Msg="Fix data extraction: normalize NaN fields, handle IN RE cases"; Auth=2;
       Files=@("src/retriever.py") },

    @{ Date="2026-03-18T12:30:00"; Msg="Add case summary generation and clean metadata prefix"; Auth=2;
       Files=@("src/rag_pipeline.py") },

    @{ Date="2026-03-19T10:45:00"; Msg="Update frontend to hide null fields and show case titles"; Auth=1;
       Files=@("client/src/components/ChatMessage.tsx","client/src/App.tsx","client/src/index.css") },

    @{ Date="2026-03-20T15:00:00"; Msg="Final polish: summary block styling and build verification"; Auth=0;
       Files=@("client/src/index.css","client/src/App.tsx") }
)

# ═══════════════════════════════════════════════════════════════════════
#  EXECUTION
# ═══════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  LexSearch - Incremental Git History Builder" -ForegroundColor Cyan
Write-Host "  $($commits.Count) commits across 3 contributors" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Backup all files ──
Write-Host "[1/5] Backing up project files..." -ForegroundColor Yellow

if (Test-Path $BACKUP) { Remove-Item -Recurse -Force $BACKUP }
New-Item -ItemType Directory -Path $BACKUP -Force | Out-Null

# Copy everything except node_modules, .git, __pycache__, dist, _backup_temp, simulate scripts
$excludeDirs = @("node_modules", ".git", "__pycache__", "dist", "_backup_temp", ".gemini")
Get-ChildItem -Path $PROJECT -Force | Where-Object {
    $_.Name -notin $excludeDirs -and
    $_.Name -ne "simulate_commits.ps1" -and
    $_.Name -ne "simulate_commits_v2.ps1" -and
    $_.Name -ne ".commit_marker"
} | ForEach-Object {
    if ($_.PSIsContainer) {
        Copy-Item -Path $_.FullName -Destination "$BACKUP\$($_.Name)" -Recurse -Force
    } else {
        Copy-Item -Path $_.FullName -Destination "$BACKUP\$($_.Name)" -Force
    }
}
Write-Host "  Backed up to: $BACKUP" -ForegroundColor Gray

# ── Step 2: Clear project directory (keep node_modules, scripts, backup) ──
Write-Host "[2/5] Clearing project directory..." -ForegroundColor Yellow

Get-ChildItem -Path $PROJECT -Force | Where-Object {
    $_.Name -notin $excludeDirs -and
    $_.Name -ne "simulate_commits.ps1" -and
    $_.Name -ne "simulate_commits_v2.ps1" -and
    $_.Name -ne "_backup_temp" -and
    $_.Name -ne ".commit_marker"
} | ForEach-Object {
    Remove-Item -Path $_.FullName -Recurse -Force
}

# ── Step 3: Initialize git ──
Write-Host "[3/5] Initializing fresh git repository..." -ForegroundColor Yellow

if (Test-Path "$PROJECT\.git") { Remove-Item -Recurse -Force "$PROJECT\.git" }
git init $PROJECT 2>$null | Out-Null
Write-Host ""

# ── Step 4: Create commits incrementally ──
Write-Host "[4/5] Creating $($commits.Count) incremental commits..." -ForegroundColor Yellow
Write-Host ""

$count = 0
foreach ($c in $commits) {
    $count++
    $author = $contributors[$c.Auth]

    # Copy each file from backup to project
    foreach ($f in $c.Files) {
        $srcPath = Join-Path $BACKUP $f
        $dstPath = Join-Path $PROJECT $f

        if (Test-Path $srcPath) {
            # Create parent directory if needed
            $parentDir = Split-Path $dstPath -Parent
            if (-not (Test-Path $parentDir)) {
                New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
            }

            # Copy file (or directory)
            if ((Get-Item $srcPath).PSIsContainer) {
                Copy-Item -Path $srcPath -Destination $dstPath -Recurse -Force
            } else {
                Copy-Item -Path $srcPath -Destination $dstPath -Force
            }
        }
    }

    # Stage the files for this commit
    foreach ($f in $c.Files) {
        $dstPath = Join-Path $PROJECT $f
        if (Test-Path $dstPath) {
            git -C $PROJECT add $dstPath 2>$null
        }
    }

    # Verify something is staged, otherwise stage all
    $staged = git -C $PROJECT diff --cached --name-only 2>$null
    if (-not $staged) {
        git -C $PROJECT add -A 2>$null
    }

    # Set author/date environment
    $env:GIT_AUTHOR_DATE = $c.Date
    $env:GIT_COMMITTER_DATE = $c.Date
    $env:GIT_AUTHOR_NAME = $author.Name
    $env:GIT_AUTHOR_EMAIL = $author.Email
    $env:GIT_COMMITTER_NAME = $author.Name
    $env:GIT_COMMITTER_EMAIL = $author.Email

    git -C $PROJECT commit -m $c.Msg --allow-empty 2>$null | Out-Null

    $shortDate = $c.Date.Substring(0, 10)
    $truncMsg = $c.Msg
    if ($truncMsg.Length -gt 52) { $truncMsg = $truncMsg.Substring(0, 52) + "..." }
    $fileCount = $c.Files.Count
    $logLine = "  [$count/50] $shortDate  $($author.Name.PadRight(16)) (+$fileCount files) $truncMsg"
    Write-Host $logLine -ForegroundColor Gray
}

# Clean env vars
$envVars = @("GIT_AUTHOR_DATE","GIT_COMMITTER_DATE","GIT_AUTHOR_NAME","GIT_AUTHOR_EMAIL","GIT_COMMITTER_NAME","GIT_COMMITTER_EMAIL")
foreach ($v in $envVars) { Remove-Item "Env:$v" -ErrorAction SilentlyContinue }

# ── Step 5: Summary ──
Write-Host ""
Write-Host "[5/5] Done! Cleaning up backup..." -ForegroundColor Green

# Remove backup
Remove-Item -Recurse -Force $BACKUP -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Cyan
$totalCommits = git -C $PROJECT rev-list --all --count 2>$null
Write-Host "  Total commits: $totalCommits" -ForegroundColor White
Write-Host ""
Write-Host "  Contributors:" -ForegroundColor Cyan
git -C $PROJECT shortlog -sn --all
Write-Host ""
Write-Host "  First commit:" -ForegroundColor Cyan
git -C $PROJECT log --reverse --format="    %ai  %an - %s" --all | Select-Object -First 1
Write-Host "  Last commit:" -ForegroundColor Cyan
git -C $PROJECT log --format="    %ai  %an - %s" --all | Select-Object -First 1
Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Incremental git history created!" -ForegroundColor Green
Write-Host "  Next steps:" -ForegroundColor Green
Write-Host "    git remote add origin <URL>" -ForegroundColor White
Write-Host "    git branch -M main" -ForegroundColor White
Write-Host "    git push --force origin main" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Green
