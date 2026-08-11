!macro customInit
  nsExec::ExecToLog 'taskkill.exe /IM "MD-to-DOCX.exe" /T /F'
!macroend

!macro customUnInit
  nsExec::ExecToLog 'taskkill.exe /IM "MD-to-DOCX.exe" /T /F'
!macroend
