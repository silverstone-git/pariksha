# Local dev guide

## to spin up the servers
- if you find no ./node_modules and no cli/venv_pariksha,
    put env vars 
        for local play:
            VITE_API_BASE_URL="http://127.0.0.1:8671"
            PARIKSHA_ADMIN_SECRET="super_secret_default"
        for live play:
            VITE_API_BASE_URL="https://outsie.aryan.cfd"
            PARIKSHA_ADMIN_SECRET="***"
    in `.env.development`

    ### frontend on 5173
    > bun install
    > bun run dev

    ### cli setup
    > python -m venv cli/venv_pariksha
    > ./cli/venv_pariksha/bin/pip install -r ./cli/requirements.txt

    ### outstagram setup
    > in terminal session / environment have these loaded:

    export OUTSTAGRAM_SECRET_KEY="***"
    export OUTSTAGRAM_USERNAME="***"
    export OUTSTAGRAM_PASSWORD="***"
    export OUTSTAGRAM_DBHOST="***"
    export OUTSTAGRAM_DBNAME="outsie"
    export OUTSTAGRAM_ALLOWED_ORIGIN_1="http://localhost:5173"
    export OUTSTAGRAM_ALLOWED_ORIGIN_2="https://pariksha.aryan.cfd"
    export OUTSTAGRAM_DBNAME="outsie"
    export S3_REGION="auto"
    export S3_ENDPOINT="https://***.r2.cloudflarestorage.com/outstagram"
    export S3_BUCKET="https://***.r2.cloudflarestorage.com/outstagram"
    export AWS_ACCESS_KEY_ID="***"
    export AWS_SECRET_ACCESS_KEY="***"
    export AWS_DEFAULT_REGION="auto"
    export PARIKSHA_ADMIN_SECRET="***"

    - then start the chromadb:
        docker run -d -p 9000:8000 --name chromadb chromadb/chroma:latest

    - then start the outsie server on port 8671, in the outstagram project directory
        docker compose build
        docker compose down
        docker compose up -d
        docker compose logs -f

## action scripts:
- to destructively download cloud questions into local
> ./cli/venv_pariksha/bin/python3 cli/sync_download_destructive.py --group <group_name>

- a safer download option:
>  ./cli/venv_pariksha/bin/python3 cli/sync_download_safe.py --topic <topic_slug> --group pg_physics


- safe upload option:
> ./cli/venv_pariksha/bin/python3 cli/sync_upload_safe.py --group pg_physics

- to destroy questions in cloud and instead PUT the ones which are currently local (its implemented in API as POST because it can duplicate things if run again and again without doing the DELETE first, which is handled quite well in the destructive_sync)
> ./cli/venv_pariksha/bin/python3 cli/sync_upload_destructive.py --topic analog_electronics --group pg_physics


- to make new questions, keep the knowledge for each group in ___my_group_name___knowledge_bank and, use the admin panel
  batch expand option or use the CLI for generate_questions.py
