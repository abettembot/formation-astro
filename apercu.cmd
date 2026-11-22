@echo off
rem Aperçu local du site : double-cliquer, puis fermer cette fenêtre pour arrêter.
cd /d "%~dp0"
echo Apercu local : http://localhost:8000/
echo Fermez cette fenetre pour arreter l'apercu.
start "" http://localhost:8000/
python -m http.server 8000
