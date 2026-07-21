Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Define o diretorio de trabalho como a pasta do script
ScriptPath = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = ScriptPath

' Inicia o servidor backend oculto (0 = ocultar janela, false = nao esperar concluir)
WshShell.Run "cmd.exe /c npm run server", 0, false

' Inicia o frontend Vite oculto
WshShell.Run "cmd.exe /c npm run dev", 0, false

' Aguarda 3 segundos para que as portas sejam abertas
WScript.Sleep 3000

' Abre o navegador no endereço do frontend
WshShell.Run "cmd.exe /c start http://localhost:5173", 0, false
