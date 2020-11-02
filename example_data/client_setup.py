import subprocess
import sys


def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package, "--quiet"])

install("grpcio")
install("grpcio-tools")
install("protobuf")

print("Done!")
