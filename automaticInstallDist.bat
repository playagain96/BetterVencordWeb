set "sourceFolder=%~dp0dist"
set "destinationFolder=%APPDATA%\Vencord\dist"

xcopy /E /I "%sourceFolder%" "%destinationFolder%\"

echo Files copied to %destinationFolder%
pause
