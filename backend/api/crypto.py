import base64
import hashlib
import os
from django.conf import settings

def _get_key_bytes() -> bytes:
    key_str = getattr(settings, 'SECRET_KEY', 'default-rgs-secret-fallback-key')
    return hashlib.sha256(key_str.encode('utf-8')).digest()

def encrypt_password(plain_text: str) -> str:
    """
    Encrypts a plain text password using a deterministic key + random IV stream cipher.
    Returns string prefixed with 'enc:'
    """
    if not plain_text:
        return ""
    if plain_text.startswith("enc:"):
        return plain_text
    
    iv = os.urandom(16)
    key_bytes = _get_key_bytes()
    text_bytes = plain_text.encode('utf-8')
    
    keystream = b''
    counter = 0
    while len(keystream) < len(text_bytes):
        h = hashlib.sha256(key_bytes + iv + counter.to_bytes(4, 'big')).digest()
        keystream += h
        counter += 1
        
    cipher_bytes = bytes([b ^ k for b, k in zip(text_bytes, keystream)])
    return "enc:" + base64.b64encode(iv + cipher_bytes).decode('ascii')

def decrypt_password(cipher_text: str) -> str:
    """
    Decrypts an encrypted password string prefixed with 'enc:'
    """
    if not cipher_text:
        return ""
    if not cipher_text.startswith("enc:"):
        return cipher_text
    
    try:
        raw = base64.b64decode(cipher_text[4:])
        if len(raw) < 16:
            return ""
        iv = raw[:16]
        cipher_bytes = raw[16:]
        key_bytes = _get_key_bytes()
        
        keystream = b''
        counter = 0
        while len(keystream) < len(cipher_bytes):
            h = hashlib.sha256(key_bytes + iv + counter.to_bytes(4, 'big')).digest()
            keystream += h
            counter += 1
            
        plain_bytes = bytes([b ^ k for b, k in zip(cipher_bytes, keystream)])
        return plain_bytes.decode('utf-8', errors='ignore')
    except Exception:
        return ""
