import hashlib
import os


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    salt_hex = salt.hex()
    hashed = hashlib.sha256(salt + password.encode()).hexdigest()
    return f"{salt_hex}:{hashed}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, saved_hash = stored_hash.split(":")
        salt = bytes.fromhex(salt_hex)
        new_hash = hashlib.sha256(salt + password.encode()).hexdigest()
        return new_hash == saved_hash
    except Exception:
        return False
