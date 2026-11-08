#!/usr/bin/env bash
# Creates your Google Play UPLOAD key and wires it into local release builds.
#
#   bash scripts/create-upload-key.sh
#
# - keystore:  ~/keys/fruitpop-upload.jks   (outside the repo, never committed)
# - password:  random, saved to ~/.gradle/gradle.properties (outside the repo, chmod 600)
# BACK BOTH UP (password manager + an offline copy). Losing them means asking Play support
# for an upload-key reset, which takes days.
set -euo pipefail

KEYSTORE="$HOME/keys/fruitpop-upload.jks"
PROPS="$HOME/.gradle/gradle.properties"
ALIAS="upload"
DNAME="${DNAME:-CN=Deepanshu Games, O=Deepanshu Games, C=IN}"

if [ -f "$KEYSTORE" ]; then
  echo "Upload key already exists at $KEYSTORE — not overwriting it."
  exit 1
fi
if grep -q '^FPM_UPLOAD_STORE_FILE=' "$PROPS" 2>/dev/null; then
  echo "$PROPS already has FPM_UPLOAD_* entries — remove them first if you really want a new key."
  exit 1
fi

KEYTOOL="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}/bin/keytool"
[ -x "$KEYTOOL" ] || KEYTOOL="$(command -v keytool)"

PASS="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 28)"

mkdir -p "$(dirname "$KEYSTORE")" "$(dirname "$PROPS")"
"$KEYTOOL" -genkeypair -v -storetype PKCS12 -keystore "$KEYSTORE" -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" -dname "$DNAME" >/dev/null 2>&1
chmod 600 "$KEYSTORE"

touch "$PROPS"
chmod 600 "$PROPS"
{
  echo ""
  echo "# Fruit Pop Merge — Google Play upload key (keep secret, back up)"
  echo "FPM_UPLOAD_STORE_FILE=$KEYSTORE"
  echo "FPM_UPLOAD_KEY_ALIAS=$ALIAS"
  echo "FPM_UPLOAD_STORE_PASSWORD=$PASS"
  echo "FPM_UPLOAD_KEY_PASSWORD=$PASS"
} >> "$PROPS"

echo "✅ Upload key created: $KEYSTORE"
echo "✅ Password saved in:   $PROPS  (lines starting FPM_UPLOAD_)"
echo ""
echo "NOW back up both: copy the .jks file and the password into a password manager"
echo "(or open $PROPS to see the password). Do not share them with anyone."
