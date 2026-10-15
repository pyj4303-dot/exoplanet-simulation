$listener = New-Object System.Net.HttpListener;
$listener.Prefixes.Add('http://localhost:8080/');
$listener.Start();
Write-Host "Server running on http://localhost:8080/";

$baseDir = "C:\Users\user\.gemini\antigravity\scratch\exoplanet-simulation";

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext();
        $request = $context.Request;
        $response = $context.Response;
        
        $relPath = $request.Url.LocalPath.TrimStart('/');
        if ([string]::IsNullOrWhiteSpace($relPath)) { $relPath = "index.html" }
        
        $filePath = Join-Path $baseDir $relPath;

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath);
            $response.ContentLength64 = $bytes.Length;
            
            if ($filePath.EndsWith('.html')) { $response.ContentType = 'text/html; charset=utf-8' }
            elseif ($filePath.EndsWith('.css')) { $response.ContentType = 'text/css' }
            elseif ($filePath.EndsWith('.js')) { $response.ContentType = 'application/javascript' }
            
            $response.OutputStream.Write($bytes, 0, $bytes.Length);
        } else {
            $response.StatusCode = 404;
        }
        $response.Close();
    } catch {
        # continue loop on non-fatal error
    }
}
