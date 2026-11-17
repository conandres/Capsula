import re
p = 'android/app/build.gradle'
s = open(p).read()
blk = """
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
"""
s = re.sub(r'(\nandroid\s*\{)', lambda m: m.group(1) + blk, s, count=1)
open(p, 'w').write(s)
