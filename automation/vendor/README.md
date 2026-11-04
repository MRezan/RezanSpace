These CPU adapters were copied from the user's reference project
Asif-Rezan/Somoy-Jatri at f985c80b40ac2c6aa25c832ac8e29258e2b3296a.
Only text generation and image generation are included. Video, music, narration,
YouTube credentials and Google Drive credentials are not used.
The Qwen model revision and SHA-256 check, SSD-1B pinned revision and image safety
checks remain intact. Blog-specific prompting and delivery live one level above.

Blog adaptation: long string bounds are omitted only from the native decoding grammar to avoid a llama.cpp grammar-parser crash. The complete original JSON Schema still validates every generated result in Python before use.
