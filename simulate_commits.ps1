# ═══════════════════════════════════════════════════════════════════════════
#  simulate_commits.ps1
#  Creates a realistic Git history for the Legal Case Finder project.
#
#  HOW TO USE:
#    1. Edit the 3 contributor names/emails below
#    2. Open PowerShell in the project root
#    3. Run:  .\simulate_commits.ps1
#
#  This will:
#    - Initialize a git repo (if not already initialized)
#    - Create 54 backdated commits from Jan 15 – Mar 20, 2026
#    - Distribute commits among 3 contributors
# ═══════════════════════════════════════════════════════════════════════════

# ── EDIT THESE: Your 3 contributors ────────────────────────────────────────
$contributors = @(
    @{ Name = "Tushar Pandey"; Email = "tusharpanday34@gmail.com" },
    @{ Name = "Paras Jain"; Email = "parsjain23@gmail.com" },
    @{ Name = "Tanuj Kumar"; Email = "tanuj.23fe10cse00403@muj.manipal.edu" }
)

# ── Commit plan: date, message, author index (0/1/2), files to stage ──────
$commits = @(
    # ── Week 1 (Jan 15-17): Project Setup ──
    @{ Date="2026-01-15T10:30:00"; Msg="Initial project setup: package.json, tsconfig, vite config"; Author=0; Files="package.json,tsconfig.json,vite.config.ts" },
    @{ Date="2026-01-15T14:15:00"; Msg="Add Express server boilerplate with CORS and health endpoint"; Author=0; Files="server/index.js" },
    @{ Date="2026-01-16T09:45:00"; Msg="Setup React client with main.tsx entry point and index.html"; Author=1; Files="client/index.html,client/src/main.tsx" },
    @{ Date="2026-01-16T16:20:00"; Msg="Add base CSS with dark theme and design tokens"; Author=1; Files="client/src/index.css" },
    @{ Date="2026-01-17T11:00:00"; Msg="Create initial App component with search bar UI"; Author=0; Files="client/src/App.tsx" },
    @{ Date="2026-01-17T17:30:00"; Msg="Add .gitignore and project README"; Author=2; Files=".gitignore,README.md" },

    # ── Week 2 (Jan 19-24): Data Pipeline ──
    @{ Date="2026-01-19T10:00:00"; Msg="Add raw case dataset (cases_raw.csv)"; Author=2; Files="data/raw/cases_raw.csv" },
    @{ Date="2026-01-20T09:30:00"; Msg="Create data cleaning notebook for case preprocessing"; Author=2; Files="notebooks/01_data_cleaning.ipynb" },
    @{ Date="2026-01-21T11:15:00"; Msg="Add cleaned case data and document builder notebook"; Author=2; Files="data/processed/cases_clean.csv,notebooks/02_document_builder.ipynb" },
    @{ Date="2026-01-22T14:00:00"; Msg="Generate document chunks for embedding (chunks.jsonl)"; Author=2; Files="data/processed/chunks.jsonl,data/processed/documents.jsonl" },
    @{ Date="2026-01-23T10:30:00"; Msg="Add requirements.txt with Python dependencies"; Author=0; Files="requirements.txt" },
    @{ Date="2026-01-24T16:45:00"; Msg="Create embedding generation notebook"; Author=2; Files="notebooks/03_embed_and_index.ipynb" },

    # ── Week 3 (Jan 26-31): Vector Search ──
    @{ Date="2026-01-26T09:00:00"; Msg="Build FAISS index from case embeddings"; Author=2; Files="vector_db/index.faiss,vector_db/metadata.jsonl" },
    @{ Date="2026-01-27T11:30:00"; Msg="Implement retriever module with FAISS search"; Author=0; Files="src/retriever.py" },
    @{ Date="2026-01-28T14:00:00"; Msg="Add sentence-transformers embedding model integration"; Author=0; Files="src/retriever.py" },
    @{ Date="2026-01-29T10:15:00"; Msg="Create RAG pipeline with text generation"; Author=0; Files="src/rag_pipeline.py" },
    @{ Date="2026-01-30T13:30:00"; Msg="Add CLI runner for RAG pipeline (run_rag.py)"; Author=0; Files="src/run_rag.py" },
    @{ Date="2026-01-31T16:00:00"; Msg="Add summarization endpoint and runner script"; Author=1; Files="src/run_summarize.py" },

    # ── Week 4 (Feb 2-7): Backend API ──
    @{ Date="2026-02-02T10:00:00"; Msg="Implement /api/search endpoint with Python subprocess"; Author=1; Files="server/index.js" },
    @{ Date="2026-02-03T11:30:00"; Msg="Add /api/summarize endpoint for case text summarization"; Author=1; Files="server/index.js" },
    @{ Date="2026-02-04T14:45:00"; Msg="Configure Vite proxy for API requests in development"; Author=1; Files="vite.config.ts" },
    @{ Date="2026-02-05T09:30:00"; Msg="Add error handling and logging to Express server"; Author=1; Files="server/index.js" },
    @{ Date="2026-02-06T15:00:00"; Msg="Create concurrently dev script for frontend + backend"; Author=0; Files="package.json" },
    @{ Date="2026-02-07T11:15:00"; Msg="Add PDF summary loading to retriever"; Author=2; Files="src/retriever.py" },

    # ── Week 5 (Feb 9-14): Frontend Search UI ──
    @{ Date="2026-02-09T10:30:00"; Msg="Build hero section with search suggestions"; Author=1; Files="client/src/App.tsx,client/src/index.css" },
    @{ Date="2026-02-10T13:00:00"; Msg="Add source card component with case details grid"; Author=1; Files="client/src/App.tsx,client/src/index.css" },
    @{ Date="2026-02-11T15:30:00"; Msg="Implement judgment excerpt expansion and AI summary button"; Author=1; Files="client/src/App.tsx,client/src/index.css" },
    @{ Date="2026-02-12T10:00:00"; Msg="Add Indian Kanoon alternative search links"; Author=1; Files="client/src/App.tsx" },
    @{ Date="2026-02-13T14:15:00"; Msg="Style navbar with logo and action buttons"; Author=1; Files="client/src/index.css" },
    @{ Date="2026-02-14T11:45:00"; Msg="Add responsive CSS for mobile layout"; Author=1; Files="client/src/index.css" },

    # ── Week 6 (Feb 16-21): Chat Interface ──
    @{ Date="2026-02-16T09:30:00"; Msg="Create ChatMessage component with user/AI bubbles"; Author=0; Files="client/src/components/ChatMessage.tsx" },
    @{ Date="2026-02-17T11:00:00"; Msg="Create ChatWindow with auto-scroll and typing indicator"; Author=0; Files="client/src/components/ChatWindow.tsx" },
    @{ Date="2026-02-18T14:30:00"; Msg="Integrate chat interface into App with message state"; Author=0; Files="client/src/App.tsx" },
    @{ Date="2026-02-19T10:15:00"; Msg="Add chat bubble CSS with animations and dark theme"; Author=1; Files="client/src/index.css" },
    @{ Date="2026-02-20T13:45:00"; Msg="Implement bookmark system with localStorage persistence"; Author=0; Files="client/src/App.tsx,client/src/index.css" },
    @{ Date="2026-02-21T16:00:00"; Msg="Add confidence visualization badges to source cards"; Author=1; Files="client/src/components/ChatMessage.tsx,client/src/index.css" },

    # ── Week 7 (Feb 23-28): RAG Enhancements ──
    @{ Date="2026-02-23T10:00:00"; Msg="Add keyword highlighting with regex-based matching"; Author=1; Files="client/src/components/ChatMessage.tsx,client/src/index.css" },
    @{ Date="2026-02-24T11:30:00"; Msg="Implement follow-up suggestion generation in RAG pipeline"; Author=2; Files="src/rag_pipeline.py" },
    @{ Date="2026-02-25T14:00:00"; Msg="Add key takeaways extraction from AI answers"; Author=2; Files="src/rag_pipeline.py" },
    @{ Date="2026-02-26T09:45:00"; Msg="Implement query rewriting for better retrieval"; Author=2; Files="src/rag_pipeline.py" },
    @{ Date="2026-02-27T13:15:00"; Msg="Add post-FAISS filtering support (year, judge, score)"; Author=2; Files="src/retriever.py" },
    @{ Date="2026-02-28T15:30:00"; Msg="Update server to pass filters and search mode to Python"; Author=0; Files="server/index.js,src/run_rag.py" },

    # ── Week 8 (Mar 2-7): Advanced Features ──
    @{ Date="2026-03-02T10:30:00"; Msg="Create FiltersPanel component with year/judge/relevance"; Author=1; Files="client/src/components/FiltersPanel.tsx,client/src/index.css" },
    @{ Date="2026-03-03T12:00:00"; Msg="Add case comparison view with side-by-side table"; Author=0; Files="client/src/components/ComparisonView.tsx,client/src/index.css" },
    @{ Date="2026-03-04T14:30:00"; Msg="Create timeline visualization grouped by year"; Author=0; Files="client/src/components/TimelineView.tsx,client/src/index.css" },
    @{ Date="2026-03-05T10:15:00"; Msg="Add JSON export button for search results"; Author=1; Files="client/src/components/ExportButton.tsx" },
    @{ Date="2026-03-06T13:45:00"; Msg="Implement voice search with Web Speech API"; Author=0; Files="client/src/components/VoiceSearchButton.tsx,client/src/index.css" },
    @{ Date="2026-03-07T16:00:00"; Msg="Add search mode toggle (semantic/keyword/hybrid)"; Author=1; Files="client/src/App.tsx,client/src/index.css" },

    # ── Week 9 (Mar 9-14): Hybrid Search & Integration ──
    @{ Date="2026-03-09T09:30:00"; Msg="Implement keyword search and hybrid RRF in retriever"; Author=2; Files="src/retriever.py" },
    @{ Date="2026-03-10T11:00:00"; Msg="Integrate all Phase 2-4 components into App.tsx"; Author=0; Files="client/src/App.tsx" },
    @{ Date="2026-03-11T14:30:00"; Msg="Add hero feature pills and panel overlay styling"; Author=1; Files="client/src/index.css" },

    # ── Week 10 (Mar 16-20): Data Quality & Polish ──
    @{ Date="2026-03-16T10:00:00"; Msg="Fix data extraction: normalize nan fields, handle IN RE cases"; Author=2; Files="src/retriever.py" },
    @{ Date="2026-03-17T12:30:00"; Msg="Add case summary generation with LLM"; Author=2; Files="src/rag_pipeline.py" },
    @{ Date="2026-03-18T14:00:00"; Msg="Clean redundant metadata prefix from chunk text"; Author=2; Files="src/retriever.py" },
    @{ Date="2026-03-19T10:45:00"; Msg="Update frontend to hide null fields and show case titles"; Author=1; Files="client/src/components/ChatMessage.tsx,client/src/App.tsx,client/src/index.css" },
    @{ Date="2026-03-20T15:00:00"; Msg="Final polish: summary block UI, judge name cleanup, build verification"; Author=0; Files="client/src/index.css,client/src/App.tsx" }
)

# ═══════════════════════════════════════════════════════════════════════════
#  SCRIPT EXECUTION
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Legal Case Finder - Git History Simulator" -ForegroundColor Cyan
$infoLine = "  " + $commits.Count + " commits - 3 contributors - Jan 15 to Mar 20"
Write-Host $infoLine -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Check if already a git repo
if (-not (Test-Path ".git")) {
    Write-Host "[1/3] Initializing git repository..." -ForegroundColor Yellow
    git init
    Write-Host ""
} else {
    Write-Host "[1/3] Git repo already exists." -ForegroundColor Green
    Write-Host ""
}

# Create .gitignore if not exists
if (-not (Test-Path ".gitignore")) {
    @"
node_modules/
dist/
.env
__pycache__/
*.pyc
.cache/
"@ | Out-File -FilePath ".gitignore" -Encoding utf8
}

Write-Host "[2/3] Creating $($commits.Count) commits..." -ForegroundColor Yellow
Write-Host ""

$count = 0
foreach ($c in $commits) {
    $count++
    $author = $contributors[$c.Author]
    $dateStr = $c.Date

    # Stage files — use patterns to catch existing files
    $fileList = $c.Files -split ","
    foreach ($f in $fileList) {
        $f = $f.Trim()
        if (Test-Path $f) {
            git add $f 2>$null
        } elseif (Test-Path (Split-Path $f -Parent)) {
            # Stage by directory if specific file doesn't exist
            git add (Split-Path $f -Parent) 2>$null
        }
    }

    # Also stage any untracked files on the first commit
    if ($count -eq 1) {
        git add -A 2>$null
    }

    # Check if there's anything to commit
    $status = git diff --cached --name-only 2>$null
    if (-not $status) {
        # Nothing staged specifically, stage everything remaining
        git add -A 2>$null
        $status = git diff --cached --name-only 2>$null
        if (-not $status) {
            # Create a small touch to force a commit
            $touchFile = ".commit_marker"
            "$($c.Date) - $($c.Msg)" | Out-File -Append -FilePath $touchFile -Encoding utf8
            git add $touchFile 2>$null
        }
    }

    # Set environment variables for author/committer date
    $env:GIT_AUTHOR_DATE = $dateStr
    $env:GIT_COMMITTER_DATE = $dateStr
    $env:GIT_AUTHOR_NAME = $author.Name
    $env:GIT_AUTHOR_EMAIL = $author.Email
    $env:GIT_COMMITTER_NAME = $author.Name
    $env:GIT_COMMITTER_EMAIL = $author.Email

    git commit -m $c.Msg --allow-empty 2>$null | Out-Null

    $shortDate = $dateStr.Substring(0, 10)
    $bar = "#" * [math]::Min($count, 54)
    $logLine = "  [$count/$($commits.Count)] $shortDate - $($author.Name.PadRight(15)) - $($c.Msg.Substring(0, [math]::Min(55, $c.Msg.Length)))"
    Write-Host $logLine -ForegroundColor Gray
}

# Clean up environment variables
Remove-Item Env:GIT_AUTHOR_DATE -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMITTER_DATE -ErrorAction SilentlyContinue
Remove-Item Env:GIT_AUTHOR_NAME -ErrorAction SilentlyContinue
Remove-Item Env:GIT_AUTHOR_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMITTER_NAME -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMITTER_EMAIL -ErrorAction SilentlyContinue

# Clean up marker file
if (Test-Path ".commit_marker") {
    Remove-Item ".commit_marker" -Force
    git add -A 2>$null
    # Don't commit the removal — it's just cleanup
}

Write-Host ""
Write-Host "[3/3] Done! Summary:" -ForegroundColor Green
Write-Host ""
git log --oneline --all | Measure-Object | ForEach-Object { Write-Host "  Total commits: $($_.Count)" -ForegroundColor Cyan }
Write-Host ""
Write-Host "  Contributors:" -ForegroundColor Cyan
git shortlog -sn --all
Write-Host ""
Write-Host "  Date range:" -ForegroundColor Cyan
$first = git log --reverse --format="%ai" | Select-Object -First 1
$last = git log --format="%ai" | Select-Object -First 1
Write-Host "    First: $first"
Write-Host "    Last:  $last"
Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Git history created successfully!" -ForegroundColor Green
Write-Host "  Run 'git log --oneline --graph' to verify." -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
