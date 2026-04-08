Add-Type -AssemblyName System.Drawing
$sourcePath = "C:\Users\Mustafa\.gemini\antigravity\brain\532f01a9-f8d8-4339-9f0c-9e2f7be1b4ff\media__1775633256638.jpg"
$destPath = "C:\Users\Mustafa\Desktop\StrukCuan\android\app\src\main\res\drawable\splash.png"

$img = [System.Drawing.Image]::FromFile($sourcePath)
$bmp = New-Object System.Drawing.Bitmap(1024, 1024)
$g = [System.Drawing.Graphics]::FromImage($bmp)

$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$g.DrawImage($img, 0, 0, 1024, 1024)

$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$img.Dispose()
Write-Host "Success: Converted $sourcePath to $destPath as TRUE PNG"
