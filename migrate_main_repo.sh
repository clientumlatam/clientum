#!/bin/bash

# Define la ruta y la URL del NUEVO repositorio en GitHub
SOURCE_DIR="/home/clientum/clientum"
NEW_REPO_URL="https://github.com/clientumlatam/clientum.git"

cd "$SOURCE_DIR" || { echo "Error: Directorio $SOURCE_DIR no encontrado"; exit 1; }

echo "--- Iniciando migración de /home/clientum/clientum hacia clientum (GitHub) ---"

# Asegurar .gitignore para evitar subida de dependencias
cat << 'EOF' > .gitignore
node_modules/
.pnpm-store/
.env
.env.local
.DS_Store
dist/
build/
.next/
*.log
EOF

# Reiniciar historial de Git
rm -rf .git
git init
git add .
git commit -m "chore: commit inicial para clientum"
git branch -M main

# Conectar al nuevo repositorio remoto
git remote remove origin 2>/dev/null
git remote add origin $NEW_REPO_URL

# Subir al nuevo repositorio
git push -u origin main -f

echo "--- ¡Migración completada con éxito a $NEW_REPO_URL! ---"