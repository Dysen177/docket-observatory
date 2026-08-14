; CrossOver/Wine does not reliably implement the PowerShell/tasklist path used
; by electron-builder's default app-running check. Use the bundled NSIS process
; plugin so an assisted installer can finish an upgrade without a deadlock.
!macro customCheckAppRunning
  nsProcess::FindProcess "${APP_EXECUTABLE_FILENAME}"
  Pop $R0
  ${If} $R0 == 0
    nsProcess::CloseProcess "${APP_EXECUTABLE_FILENAME}"
    Pop $R1
    Sleep 500
    nsProcess::FindProcess "${APP_EXECUTABLE_FILENAME}"
    Pop $R0
    ${If} $R0 == 0
      nsProcess::KillProcess "${APP_EXECUTABLE_FILENAME}"
      Pop $R1
      Sleep 1000
    ${EndIf}
  ${EndIf}
!macroend
