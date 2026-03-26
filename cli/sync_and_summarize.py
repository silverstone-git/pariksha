import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# Topic mapping from src/utils.ts
SUBJECT_GROUPS = {
  "Quantum Mechanics": ["Foundations of Quantum Mechanics", "Schrödinger Equation", "Angular Momentum", "Hydrogen Atom", "Approximation Methods", "Scattering Theory"],
  "Electromagnetic Theory": ["Magnetostatics", "Electrodynamics", "Electromagnetic Waves", "Waveguides and Cavities", "Radiation"],
  "Thermodynamics & Statistical": ["Laws of Thermodynamics", "Statistical Ensembles", "Quantum Statistics", "Random Walks & Ising Model"],
  "Mathematical Physics": ["Complex Analysis", "Linear Algebra", "Differential Equations", "Fourier & Laplace Transforms", "Numerical Methods"],
  "Classical Mechanics": ["Constraints", "Lagrangian Dynamics", "Hamiltonian Dynamics", "Symmetry and Conservation Laws", "Central Force Motion", "Scattering", "Small Oscillations", "Rigid Body Dynamics", "Canonical Transformations", "Poisson Brackets", "Kepler Problems", "Special Theory of Relativity", "Phase Space Dynamics", "Action-Angle Variables", "Non-Inertial Frames", "Hamilton-Jacobi Theory"],
  "Solid State Physics": ["Condensed Matter"],
  "Atomic & Molecular": ["Atomic Physics", "Molecular Physics"],
  "Nuclear & Particle": ["Nuclear Physics", "Particle Physics"],
  "Electronics": ["Analog Electronics", "Digital Electronics"],
}

def sync():
    # Load env from root
    root_dir = Path(__file__).parent.parent
    load_dotenv(root_dir / ".env.development")
    
    api_url = os.getenv("VITE_API_BASE_URL", "https://outsie.aryan.cfd").rstrip("/")
    bank_dir = Path(__file__).parent / "question_bank"
    bank_dir.mkdir(exist_ok=True)

    print(f"📡 Syncing with: {api_url}")
    print(f"📂 Target folder: {bank_dir.absolute()}\n")

    all_topics = [t for group in SUBJECT_GROUPS.values() for t in group]
    summary = []

    for topic in all_topics:
        # Topic slugs are usually lowercase in filenames
        slug = topic.replace(" ", "_").lower()
        
        print(f"🔄 Syncing {topic}...", end="\r")
        
        try:
            # We use the sample API with a high count to get everything
            resp = requests.get(f"{api_url}/api/question_bank/sample?topic={slug}&count=500", timeout=10)
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
    
    print(f"\n📊 AGGREGATE STATS:")
    print(f"   - Total Questions: {total_q}")
    print(f"   - Total MSQs:      {total_msq}")
    print(f"   - Total NATs:      {total_nat}")
    print(f"   - Diversity:       {((total_msq + total_nat)/total_q)*100:.1f}% non-MCQ" if total_q > 0 else "N/A")

if __name__ == "__main__":
    sync()
