import os, re
p = 'android/app/build.gradle'
s = open(p).read()
raw = os.environ.get('REL_PW', '')
m_ = re.findall(r'[0-9a-fA-F]{24}', raw)
rel = m_[-1] if m_ else ''
if raw.strip() and not rel:
    raise SystemExit('El secreto RELEASE_KEYSTORE_PASSWORD no tiene el formato esperado (24 letras/números).')
blk = """
    signingConfigs {
""" + ("""        release {
            storeFile file('release.keystore')
            storePassword '%s'
            keyAlias 'capsula'
            keyPassword '%s'
        }
""" % (rel, rel) if rel else "") + "    }\n"
s = re.sub(r'(\nandroid\s*\{)', lambda m: m.group(1) + blk, s, count=1)
if rel:
    s = re.sub(r'(buildTypes\s*\{\s*release\s*\{)', lambda m: m.group(1) + '\n            signingConfig signingConfigs.release', s, count=1)
# Cada compilación sube el número de versión para que Android la instale como actualización
vc = 100 + int(os.environ.get('GITHUB_RUN_NUMBER', '1'))
s = re.sub(r'versionCode\s+\d+', 'versionCode %d' % vc, s, count=1)
s = re.sub(r'versionName\s+"[^"]*"', 'versionName "1.%d"' % vc, s, count=1)
open(p, 'w').write(s)

# AdMob: el ID de la app va en el manifiesto (ID de PRUEBA de Google si no hay uno propio)
m = 'android/app/src/main/AndroidManifest.xml'
x = open(m).read()
aid = os.environ.get('ADMOB_APP_ID') or 'ca-app-pub-4743502426219538~3459820047'
if 'com.google.android.gms.ads.APPLICATION_ID' not in x:
    x = x.replace('</application>', '    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="%s"/>\n    </application>' % aid, 1)
# Micrófono: notas de voz y "Hablar" con la mascota (sin esto Android bloquea la grabación)
for perm in ('android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS'):
    if perm not in x:
        x = x.replace('<application', '<uses-permission android:name="%s"/>\n    <application' % perm, 1)
if 'android.hardware.microphone' not in x:
    x = x.replace('<application', '<uses-feature android:name="android.hardware.microphone" android:required="false"/>\n    <application', 1)
open(m, 'w').write(x)
