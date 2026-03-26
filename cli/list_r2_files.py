import os
import boto3
from botocore.config import Config
from dotenv import load_dotenv
from pathlib import Path

def list_files():
    dotenv_path = Path('cli/.env')
    load_dotenv(dotenv_path=dotenv_path)

    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    access_key = os.getenv("R2_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY")
    bucket_name = os.getenv("R2_BUCKET_NAME")

    s3 = boto3.client(
        's3',
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )

    try:
        print(f"Listing files in bucket: {bucket_name}")
        response = s3.list_objects_v2(Bucket=bucket_name)
        if 'Contents' in response:
            for obj in response['Contents']:
                print(f" - {obj['Key']}")
        else:
            print("Bucket is empty.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_files()
