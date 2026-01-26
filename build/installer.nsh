; Blueprint NSIS Installer Customizations
; This file is included by electron-builder during NSIS installer creation

; Custom installation messages
!macro customInstallMode
  ; Use the default install mode (per-user by default)
!macroend

; Run after installation is complete
!macro customInstall
  ; Associate .blueprint files with the application (optional)
  ; WriteRegStr HKCU "Software\Classes\.blueprint" "" "Blueprint.Document"
  ; WriteRegStr HKCU "Software\Classes\Blueprint.Document" "" "Blueprint Document"
  ; WriteRegStr HKCU "Software\Classes\Blueprint.Document\shell\open\command" "" '"$INSTDIR\Blueprint.exe" "%1"'
!macroend

; Run after uninstallation is complete
!macro customUnInstall
  ; Remove file associations (if added above)
  ; DeleteRegKey HKCU "Software\Classes\.blueprint"
  ; DeleteRegKey HKCU "Software\Classes\Blueprint.Document"
!macroend
