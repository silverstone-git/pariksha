import chromadb
client = chromadb.HttpClient(host="localhost", port=9000)

try:
    print("Deleting empty text_data_pg_physics if it exists...")
    client.delete_collection("text_data_pg_physics")
except Exception as e:
    print(f"Delete error (probably didn't exist): {e}")

try:
    col = client.get_collection("text_data")
    col.modify(name="text_data_pg_physics")
    print(f"Successfully renamed 'text_data' to 'text_data_pg_physics'. Count is now: {col.count()}")
except Exception as e:
    print(f"Rename error: {e}")
