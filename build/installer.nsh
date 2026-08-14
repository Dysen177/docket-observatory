; CrossOver/Wine does not reliably implement the PowerShell/tasklist query used
; by electron-builder's default app-running check. Ask the operating system to
; stop the app directly and continue even when no matching process exists.
!macro customCheckAppRunning
  nsExec::Exec '"$SYSDIR\taskkill.exe" /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Pop $R0
  Sleep 1000
!macroend
