"""Insert classes.dex into an APK without touching anything else.

Usage: python pack_dex.py <apk> <classes.dex>
"""
import os
import sys
import zipfile

apk, dex = sys.argv[1], sys.argv[2]
tmp = apk + ".tmp"
with zipfile.ZipFile(apk) as zin, zipfile.ZipFile(tmp, "w") as zout:
    for item in zin.infolist():
        if item.filename == "classes.dex":
            continue
        zout.writestr(item, zin.read(item.filename))
    zout.write(dex, "classes.dex")
os.replace(tmp, apk)
print(f"packed {dex} into {apk}")
