#!/usr/bin/env bash
# =============================================================================
# Treino Força — build + assinatura do APK de release em um único comando.
#
# Uso:
#   ./build-apk.sh
#
# Requisitos:
#   - JDK 17 (JAVA_HOME ou java no PATH)
#   - Android SDK com platform-tools, platforms;android-34 e build-tools;34.0.0
#     (variável ANDROID_HOME ou ANDROID_SDK_ROOT)
#   - Node.js 18+ e npm
#
# Saída:
#   dist/treino-forca-v<versão>-release.apk  (assinado v1 + v2 + v3)
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(pwd)"

# ---------- Cores para o resumo ----------
BOLD="$(tput bold 2>/dev/null || true)"
GREEN="$(tput setaf 2 2>/dev/null || true)"
YELLOW="$(tput setaf 3 2>/dev/null || true)"
RESET="$(tput sgr0 2>/dev/null || true)"

fail() {
  echo "${YELLOW}ERRO:${RESET} $1" >&2
  exit 1
}

# ---------- Java ----------
if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi
command -v java >/dev/null 2>&1 || fail "Java não encontrado. Instale o JDK 17 e defina JAVA_HOME."
JAVA_MAJOR="$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d. -f1)"
if [ "$JAVA_MAJOR" -lt 17 ] 2>/dev/null; then
  echo "${YELLOW}Aviso:${RESET} Java $JAVA_MAJOR detectado. O Capacitor 6 requer JDK 17+."
fi

# ---------- Android SDK ----------
ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[ -n "$ANDROID_HOME" ] || fail "Defina ANDROID_HOME (ex.: export ANDROID_HOME=\"\$HOME/Android/Sdk\")."
[ -d "$ANDROID_HOME" ] || fail "ANDROID_HOME aponta para uma pasta inexistente: $ANDROID_HOME"
BUILD_TOOLS="$(ls -d "$ANDROID_HOME"/build-tools/* 2>/dev/null | sort -V | tail -n 1 || true)"
[ -n "$BUILD_TOOLS" ] || fail "build-tools não encontrado. Rode: sdkmanager \"build-tools;34.0.0\" \"platforms;android-34\""
APKSIGNER="$BUILD_TOOLS/apksigner"
ZIPALIGN="$BUILD_TOOLS/zipalign"
[ -x "$APKSIGNER" ] || fail "apksigner não encontrado em $BUILD_TOOLS"
[ -x "$ZIPALIGN" ] || fail "zipalign não encontrado em $BUILD_TOOLS"

# ---------- Node ----------
command -v npm >/dev/null 2>&1 || fail "npm não encontrado. Instale o Node.js 18+."

# ---------- local.properties ----------
if [ ! -f android/local.properties ]; then
  echo "sdk.dir=$ANDROID_HOME" > android/local.properties
fi

# ---------- Keystore e credenciais ----------
KEYSTORE="${KEYSTORE:-$ROOT/keystore/treino-forca-release.jks}"
KEY_ALIAS="${KEY_ALIAS:-treino-forca}"
STORE_PASS="${STORE_PASS:-}"
KEY_PASS="${KEY_PASS:-}"

if [ -f android/key.properties ]; then
  # Reaproveita as credenciais existentes do projeto.
  set -a
  # shellcheck disable=SC1091
  . android/key.properties
  set +a
  KEY_ALIAS="${keyAlias:-$KEY_ALIAS}"
  STORE_PASS="${storePassword:-$STORE_PASS}"
  KEY_PASS="${keyPassword:-$KEY_PASS}"
  if [ -n "${storeFile:-}" ]; then
    if [ "${storeFile#/}" = "$storeFile" ]; then
      KEYSTORE="$ROOT/android/$storeFile"
    else
      KEYSTORE="$storeFile"
    fi
  fi
fi

if [ -z "$STORE_PASS" ] || [ -z "$KEY_PASS" ]; then
  fail "Defina a senha da keystore: export STORE_PASS=... KEY_PASS=... (ou crie android/key.properties)."
fi

if [ ! -f "$KEYSTORE" ]; then
  echo "Gerando keystore nova em $KEYSTORE ..."
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$STORE_PASS" -keypass "$KEY_PASS" \
    -dname "CN=Treino Forca, OU=Mobile, O=Treino Forca, L=Sao Paulo, ST=SP, C=BR"
fi

# key.properties sempre aponta para o keystore absoluto (funciona em qualquer máquina)
cat > android/key.properties <<EOF
storeFile=$KEYSTORE
storePassword=$STORE_PASS
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASS
EOF

# ---------- Versão ----------
VERSION_NAME="$(grep -m1 'versionName' android/app/build.gradle | sed -E 's/.*"([^"]+)".*/\1/')"
[ -n "$VERSION_NAME" ] || VERSION_NAME="1.0.0"
OUT="dist/treino-forca-v${VERSION_NAME}-release.apk"

# ---------- Dependências web + sync ----------
if [ ! -d node_modules ]; then
  echo "Instalando dependências do Capacitor..."
  if [ -f package-lock.json ]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
fi
echo "Sincronizando assets com o projeto Android..."
npx cap sync android

# ---------- Build de release (minify + shrinkResources + R8) ----------
echo "Compilando release assinado..."
( cd android && ./gradlew assembleRelease --no-daemon )

UNSIGNED="android/app/build/outputs/apk/release/app-release.apk"
[ -f "$UNSIGNED" ] || fail "APK de release não encontrado em $UNSIGNED"

# ---------- zipalign + assinatura v1/v2/v3 ----------
mkdir -p dist
ALIGNED="dist/.treino-forca-aligned.apk"
rm -f "$ALIGNED" "$OUT"
"$ZIPALIGN" -f -p 4 "$UNSIGNED" "$ALIGNED"

"$APKSIGNER" sign \
  --ks "$KEYSTORE" \
  --ks-key-alias "$KEY_ALIAS" \
  --ks-pass "pass:$STORE_PASS" \
  --key-pass "pass:$KEY_PASS" \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --v3-signing-enabled true \
  --out "$OUT" "$ALIGNED"
rm -f "$ALIGNED"

# ---------- Verificação ----------
echo
echo "Verificando assinatura..."
"$APKSIGNER" verify --verbose --print-certs "$OUT"

if command -v sha256sum >/dev/null 2>&1; then
  SHA256="$(sha256sum "$OUT" | awk '{print $1}')"
else
  SHA256="$(shasum -a 256 "$OUT" | awk '{print $1}')"
fi

echo
echo "${GREEN}${BOLD}APK assinado com sucesso.${RESET}"
echo "  Arquivo : $ROOT/$OUT"
echo "  Tamanho : $(du -h "$OUT" | awk '{print $1}')"
echo "  Versão  : $VERSION_NAME (versionCode $(grep -m1 'versionCode' android/app/build.gradle | tr -dc '0-9'))"
echo "  SHA-256 : $SHA256"
echo "  Keystore: $KEYSTORE"
echo "  Alias   : $KEY_ALIAS"
echo
echo "Instale no celular com: adb install -r \"$ROOT/$OUT\""
