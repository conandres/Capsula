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
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
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
open(p, 'w').write(s)

# AdMob: el ID de la app va en el manifiesto (ID de PRUEBA de Google si no hay uno propio)
m = 'android/app/src/main/AndroidManifest.xml'
x = open(m).read()
aid = os.environ.get('ADMOB_APP_ID') or 'ca-app-pub-4743502426219538~3459820047'
if 'com.google.android.gms.ads.APPLICATION_ID' not in x:
    x = x.replace('</application>', '    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="%s"/>\n    </application>' % aid, 1)
open(m, 'w').write(x)
