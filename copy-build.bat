@echo off
set destination_folder="%appdata%\ArmCord\plugins\1loader\dist"
set source_folder=".\dist"
xcopy /Y /E "%source_folder%\browser.js" "%destination_folder%\bundle.js"
xcopy /Y /E "%source_folder%\browser.css" "%destination_folder%\bundle.css"
