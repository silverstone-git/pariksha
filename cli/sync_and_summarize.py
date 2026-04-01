import os
import sys
import json
import requests
import urllib.parse
import argparse
from pathlib import Path
from dotenv import load_dotenv

def get_topics_for_group(group: str) -> list[str]:
    topics_file = f"{group}_question_bank_topics.txt"
    plan_path = Path(__file__).parent.parent / topics_file
    if not plan_path.exists():
        plan_path = Path(__file__).parent / topics_file
        
    if not plan_path.exists():
        print(f"❌ Error: {topics_file} not found in root or cli directory.")
        sys.exit(1)

    with open(plan_path, 'r') as f:
        topics = [line.strip().replace("* ", "") for line in f if line.strip() and not line.strip().startswith("#")]
    
    return topics

def sync(group: str):
    # Load env from root
    root_dir = Path(__file__).parent.parent
    load_dotenv(root_dir / ".env.development")
    
    api_url = os.getenv("VITE_API_BASE_URL", "https://outsie.aryan.cfd").rstrip("/")
    bank_dir = Path(__file__).parent / f"{group}_question_bank"
    bank_dir.mkdir(exist_ok=True)

    print(f"📡 Syncing with: {api_url}")
    print(f"📂 Target folder: {bank_dir.absolute()}\n")

    all_topics = get_topics_for_group(group)
    summary = []

    for topic in all_topics:
        # Topic slugs are usually lowercase in filenames
        slug = topic.replace(" ", "_").lower()
        encoded_slug = urllib.parse.quote(slug)
        
        print(f"🔄 Syncing {topic}...", end="\r")
        
        try:
            # We use the sample API with a high count to get everything
            resp = requests.get(f"{api_url}/api/question_bank/sample?topic={encoded_slug}&count=500", timeout=10)
            if resp.status_code == 200:
                questions = resp.json()
                
                # Save locally
                with open(bank_dir / f"{slug}.json", "w") as f:
                    json.dump(questions, f, indent=2)
                
                # Analyze
                counts = {"MCQ": 0, "MSQ": 0, "NAT": 0}
                for q in questions:
                    t = q.get("type", "MCQ")
                    counts[t] = counts.get(t, 0) + 1
                
                is_legacy = all("type" not in q for q in questions) if questions else True
                
                summary.append({
                    "topic": topic,
                    "total": len(questions),
                    "MCQ": counts["MCQ"],
                    "MSQ": counts["MSQ"],
                    "NAT": counts["NAT"],
                    "status": "LEGACY" if is_legacy else "ADVANCED"
                })
            else:
                summary.append({
                    "topic": topic,
                    "total": 0, "MCQ": 0, "MSQ": 0, "NAT": 0, "status": "ERROR"
                })
        except Exception as e:
            summary.append({
                "topic": topic,
                "total": 0, "MCQ": 0, "MSQ": 0, "NAT": 0, "status": f"FAILED: {str(e)[:20]}"
            })

    # Display Summary Table
    print("\n" + "="*85)
    print(f"{'TOPIC':<35} | {'TOTAL':<5} | {'MCQ':<4} | {'MSQ':<4} | {'NAT':<4} | {'STATUS':<10}")
    print("-" * 85)
    
    for s in sorted(summary, key=lambda x: x['total'], reverse=True):
        status_color = "\033[93m" if s['status'] == "LEGACY" else "\033[92m" if s['status'] == "ADVANCED" else "\033[91m"
        reset = "\033[0m"
        
        print(f"{s['topic']:<35} | {s['total']:<5} | {s['MCQ']:<4} | {s['MSQ']:<4} | {s['NAT']:<4} | {status_color}{s['status']:<10}{reset}")
    
    print("="*85)
    
    total_q = sum(s['total'] for s in summary)
    total_msq = sum(s['MSQ'] for s in summary)
    total_nat = sum(s['NAT'] for s in summary)
    
    print(f"\n📊 AGGREGATE STATS FOR '{group}':")
    print(f"   - Total Questions: {total_q}")
    print(f"   - Total MSQs:      {total_msq}")
    print(f"   - Total NATs:      {total_nat}")
    print(f"   - Diversity:       {((total_msq + total_nat)/total_q)*100:.1f}% non-MCQ" if total_q > 0 else "N/A")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync and summarize question bank from remote API.")
    parser.add_argument("--group", type=str, default="pg_physics", help="The topic group (e.g., pg_physics)")
    args = parser.parse_args()
    
    sync(args.group)
