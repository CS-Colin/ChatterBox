!include nsDialogs.nsh
!include MUI2.nsh
!ifndef BUILD_UNINSTALLER
Var InviteDialog
Var InviteInput
Var InviteCode
Var InviteValid
!endif

!macro customInit
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\chatterbox"
  File /oname=verify.ps1 "${BUILD_RESOURCES_DIR}\..\licensing\verify.ps1"
  File /oname=public.xml "${BUILD_RESOURCES_DIR}\..\licensing\public.xml"
  StrCpy $InviteValid "0"
  ${If} ${FileExists} "$APPDATA\chatterbox-desktop\activation.code"
    CopyFiles /SILENT "$APPDATA\chatterbox-desktop\activation.code" "$PLUGINSDIR\chatterbox\activation.code"
    Call VerifyInvite
    Pop $0
    ${If} $0 == "0"
      StrCpy $InviteValid "1"
    ${EndIf}
  ${EndIf}
  ${If} ${Silent}
    ${If} $InviteValid != "1"
      SetErrorLevel 1
      Quit
    ${EndIf}
  ${EndIf}
!macroend

!ifndef BUILD_UNINSTALLER
Function VerifyInvite
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\chatterbox\verify.ps1" -CodeFile "$PLUGINSDIR\chatterbox\activation.code"'
  Pop $0
  Pop $1
  Push $0
FunctionEnd

Function InvitePage
  ${If} $InviteValid == "1"
    Abort
  ${EndIf}
  !insertmacro MUI_HEADER_TEXT "Your invitation" "Enter the Chatterbox code Colin gave you."
  nsDialogs::Create 1018
  Pop $InviteDialog
  ${If} $InviteDialog == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 30u "Paste your complete activation code below. A valid invitation is required to install and use Chatterbox."
  Pop $0
  ${NSD_CreateText} 0 40u 100% 14u "$InviteCode"
  Pop $InviteInput
  ${NSD_CreateLabel} 0 65u 100% 35u "Your activation name will appear in Settings. Keep your invitation code for reinstalling."
  Pop $0
  nsDialogs::Show
FunctionEnd

Function InvitePageLeave
  ${NSD_GetText} $InviteInput $InviteCode
  FileOpen $0 "$PLUGINSDIR\chatterbox\activation.code" w
  FileWriteUTF16LE /BOM $0 $InviteCode
  FileClose $0
  Call VerifyInvite
  Pop $0
  ${If} $0 != "0"
    MessageBox MB_ICONEXCLAMATION|MB_OK "That invitation code is invalid. Paste the complete code Colin gave you."
    Abort
  ${EndIf}
  StrCpy $InviteValid "1"
FunctionEnd
!endif

!macro customPageAfterChangeDir
  Page custom InvitePage InvitePageLeave
!macroend

!macro customInstall
  ${If} $InviteValid != "1"
    SetErrorLevel 1
    Abort "A valid invitation is required."
  ${EndIf}
  CreateDirectory "$APPDATA\chatterbox-desktop"
  CopyFiles /SILENT "$PLUGINSDIR\chatterbox\activation.code" "$APPDATA\chatterbox-desktop\activation.code"
!macroend
