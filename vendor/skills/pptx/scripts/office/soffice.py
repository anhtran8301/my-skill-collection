"""Toolkit adaptation: run LibreOffice without loading shared /tmp code or a shim."""
import contextlib
import os
import subprocess
import tempfile
from pathlib import Path


def get_soffice_env():
    env = os.environ.copy()
    env["SAL_USE_VCLPLUGIN"] = "svp"
    return env


def run_soffice(args, **kwargs):
    args = list(args)
    with contextlib.ExitStack() as stack:
        if not any(str(arg).startswith("-env:UserInstallation") for arg in args):
            profile = stack.enter_context(tempfile.TemporaryDirectory(prefix="lo_profile_"))
            args = [f"-env:UserInstallation={Path(profile).as_uri()}"] + args
        return subprocess.run(["soffice"] + args, env=get_soffice_env(), **kwargs)
