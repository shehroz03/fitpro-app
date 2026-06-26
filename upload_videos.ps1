# ============================================================
#  FitCore — Supabase Storage Video Upload Script
#  Run: .\upload_videos.ps1
#  Requirement: Paste your SERVICE ROLE KEY below
# ============================================================

$SERVICE_ROLE_KEY = "PASTE_SERVICE_ROLE_KEY_HERE"   # <-- Dashboard > Settings > API > service_role

$BASE_URL  = "https://nlzuqzkxtmqabmwkggpy.supabase.co/storage/v1/object"
$BUCKET    = "exercise-videos"
$FOLDER    = "female"
$VIDEO_DIR = $PSScriptRoot   # same folder as this script

if ($SERVICE_ROLE_KEY -eq "PASTE_SERVICE_ROLE_KEY_HERE") {
    Write-Host "❌ Please paste your Supabase SERVICE ROLE KEY into this script first!" -ForegroundColor Red
    exit 1
}

# ── File mapping: local filename  →  Supabase clean name ────────────────────
$FILES = @{
    # ── WORKOUT (Leg Raises — was missing, was showing push-up video) ──────
    "Woman_doing_leg_raises_202606261654.mp4"                   = "Woman_doing_leg_raises_202606261654.mp4"

    # ── YOGA new poses ──────────────────────────────────────────────────────
    "Woman_performing_Warrior_I_pose_202606261655.mp4"          = "Woman_performing_Warrior_I_pose_202606261655.mp4"
    "Woman_performing_Chair_Pose_yoga_202606261655.mp4"         = "Woman_performing_Chair_Pose_yoga_202606261655.mp4"
    "Woman_performing_yoga_Boat_Pose_202606261702.mp4"          = "Woman_performing_yoga_Boat_Pose_202606261702.mp4"
    "Woman_performing_Camel_Pose_yoga_202606261705.mp4"         = "Woman_performing_Camel_Pose_yoga_202606261705.mp4"

    # ── MEDITATION ──────────────────────────────────────────────────────────
    "A_calm,_fit_young_woman_202606261715.mp4"                  = "Woman_performing_mindfulness_meditation_202606261715.mp4"
    "Woman_performing_body_scan_medit_202606261715.mp4"         = "Woman_performing_body_scan_meditation_202606261715.mp4"
    "Woman_performing_body_scan_medit..._202606261715.mp4"      = "Woman_performing_body_scan_meditation_202606261715.mp4"
    "Woman_chanting_Om_Mantra_yoga_202606261716.mp4"            = "Woman_chanting_Om_Mantra_yoga_202606261716.mp4"

    # ── CHEST exercises ─────────────────────────────────────────────────────
    "Woman_performing_knee_push-up_ex..._202606261718.mp4"      = "Woman_performing_knee_push-up_202606261718.mp4"
    "Woman_performing_knee_push-up_ex_202606261718.mp4"         = "Woman_performing_knee_push-up_202606261718.mp4"
    "Woman_performing_decline_push-up_202606261722.mp4"         = "Woman_performing_decline_push-up_202606261722.mp4"
    "Woman_performing_diamond_push-up_202606261723.mp4"         = "Woman_performing_diamond_push-up_202606261723.mp4"
    "Woman_performing_arm_circles_202606261725.mp4"             = "Woman_performing_arm_circles_202606261725.mp4"
    "Woman_performing_Cobra_Pose_202606261727.mp4"              = "Woman_performing_chest_cobra_pose_202606261727.mp4"
    "Woman_performing_dumbbell_chest__202606261728.mp4"         = "Woman_performing_dumbbell_chest_press_202606261728.mp4"
    "Woman_performing_dumbbell_chest_..._202606261728.mp4"      = "Woman_performing_dumbbell_chest_press_202606261728.mp4"
    "Woman_doing_resistance_band_ches_202606261730.mp4"         = "Woman_doing_resistance_band_chest_press_202606261730.mp4"
    "Woman_doing_resistance_band_ches..._202606261730.mp4"      = "Woman_doing_resistance_band_chest_press_202606261730.mp4"
    "...Action__Resistance_Band_Chest_Fly_202606261732.mp4"     = "Woman_performing_resistance_band_chest_fly_202606261732.mp4"
}

# ── Upload function ──────────────────────────────────────────────────────────
function Upload-Video($localName, $remoteName) {
    # Try the exact filename first, then look for partial match
    $localPath = Join-Path $VIDEO_DIR $localName
    if (-not (Test-Path $localPath)) {
        # Search by timestamp portion
        $ts = ($localName -replace '.*(\d{18}).*', '$1')
        $matches = Get-ChildItem $VIDEO_DIR -Filter "*.mp4" | Where-Object { $_.Name -match $ts }
        if ($matches.Count -eq 1) { $localPath = $matches[0].FullName }
        elseif ($matches.Count -gt 1) {
            # Pick the one whose name most closely matches
            $match = $matches | Where-Object { $_.Name -like "*body_scan*" -or $_.Name -like "*medit*" } | Select-Object -First 1
            if (-not $match) { $match = $matches[0] }
            $localPath = $match.FullName
        } else {
            Write-Host "  ⚠  SKIP (not found): $localName" -ForegroundColor Yellow
            return
        }
    }

    $url = "$BASE_URL/$BUCKET/$FOLDER/$remoteName"
    Write-Host "  ↑  Uploading: $remoteName" -ForegroundColor Cyan

    try {
        $bytes   = [System.IO.File]::ReadAllBytes($localPath)
        $headers = @{
            "Authorization" = "Bearer $SERVICE_ROLE_KEY"
            "Content-Type"  = "video/mp4"
            "x-upsert"      = "true"
        }
        $resp = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $bytes -UseBasicParsing
        if ($resp.StatusCode -in 200, 201) {
            Write-Host "     ✅ Done ($($bytes.Length / 1MB -as [int]) MB)" -ForegroundColor Green
        } else {
            Write-Host "     ❌ Failed: $($resp.StatusCode) $($resp.Content)" -ForegroundColor Red
        }
    } catch {
        Write-Host "     ❌ Error: $_" -ForegroundColor Red
    }
}

# ── Also upload any RENAMED ambiguous files if user renames them ─────────────
# After user renames "A_fit_young_woman_*" files, add entries above and re-run.

Write-Host "`n🚀 FitCore Video Upload — $(($FILES.Keys).Count) files`n" -ForegroundColor Magenta

$uploaded = 0
$skipped  = 0
foreach ($entry in $FILES.GetEnumerator()) {
    $ts = ($entry.Key -replace '.*_(\d{12,18}).*', '$1')
    $found = Get-ChildItem $VIDEO_DIR -Filter "*.mp4" | Where-Object { $_.Name -match $ts } | Select-Object -First 1
    if ($found) {
        Upload-Video $found.Name $entry.Value
        $uploaded++
    } else {
        Write-Host "  ⚠  SKIP (not found): $($entry.Key)" -ForegroundColor Yellow
        $skipped++
    }
}

Write-Host "`n✅ Upload complete — $uploaded uploaded, $skipped skipped`n" -ForegroundColor Magenta

# ── List unidentified ambiguous files ────────────────────────────────────────
Write-Host "📋 AMBIGUOUS files — please rename these and re-run:" -ForegroundColor Yellow
Get-ChildItem $VIDEO_DIR -Filter "A_fit_young_woman_*.mp4" | ForEach-Object {
    Write-Host "   $($_.Name)" -ForegroundColor Gray
}
Get-ChildItem $VIDEO_DIR -Filter "A_fit_athletic_woman_*.mp4" | ForEach-Object {
    Write-Host "   $($_.Name)" -ForegroundColor Gray
}
