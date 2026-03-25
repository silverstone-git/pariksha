import re
import json
import logging
from json_repair import repair_json

logger = logging.getLogger(__name__)

def fix_json_escapes(json_str: str) -> str:
    """
    Iteratively fixes invalid escape sequences in a JSON string.
    Specifically targets LaTeX backslashes that weren't properly escaped by the LLM.
    """
    current_str = json_str
    
    # 1. Fix LaTeX newlines: "\\" -> "\\\\"
    # If the LLM output "a \\ b", we want json.loads to produce "a \\ b"
    current_str = re.sub(r'(?<!\\)\\\\(?!\\)', r'\\\\\\\\', current_str)
    
    # 2. Pre-emptive fix for common LaTeX commands that start with valid escape characters
    # e.g., \frac -> \f (formfeed), \tau -> \t (tab), \nu -> \n (newline)
    latex_patterns = [
        r'frac', r'text', r'theta', r'tau', r'times', 
        r'beta', r'begin', r'bar', r'bm', r'binom', 
        r'rho', r'rightarrow', r'right', 
        r'nu', r'neq', r'nabla', r'neg',
        r'left', r'lim', r'lambda', r'mathbf', r'circ', r'theta', r'phi', r'psi', r'omega',
        r'end', r'alpha', r'gamma', r'delta', r'epsilon', r'zeta', r'eta', r'iota', r'kappa',
        r'mu', r'xi', r'pi', r'sigma', r'upsilon', r'phi', r'chi', r'psi', r'omega',
        r'int', r'sum', r'prod', r'sqrt', r'partial', r'infty'
    ]
    
    pattern_str = r'(?<!\\)\\((' + '|'.join(latex_patterns) + r')\b)'
    current_str = re.sub(pattern_str, r'\\\\\1', current_str)
    
    # 3. Iterative fix for "Invalid \escape" errors
    max_retries = 500  
    for _ in range(max_retries):
        try:
            json.loads(current_str)
            return current_str
        except json.JSONDecodeError as e:
            if "Invalid \\escape" in str(e):
                if e.pos < len(current_str):
                     current_str = current_str[:e.pos] + "\\" + current_str[e.pos:]
                else:
                    break
            else:
                break
                
    return current_str

def remove_bs(text: str) -> str:
    """
    Extracts and repairs JSON from LLM output.
    Uses regex to find JSON structures and json-repair for malformed syntax.
    """
    if not isinstance(text, str):
        return str(text)

    # Pre-clean: LLMs sometimes put "JSON" or "Output:" labels
    text = re.sub(r'^(JSON|Output|Exam):\s*', '', text.strip(), flags=re.IGNORECASE)

    # 1. Try to find content in triple backticks
    code_block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    potential_raw = code_block_match.group(1).strip() if code_block_match else text.strip()

    # 2. Heuristic extraction of array or object if raw looks like a mess
    if not (potential_raw.startswith('[') or potential_raw.startswith('{')):
        array_match = re.search(r'\[[\s\S]*\]', potential_raw)
        if array_match:
            potential_raw = array_match.group(0)
        else:
            obj_match = re.search(r'\{[\s\S]*\}', potential_raw)
            if obj_match:
                potential_raw = obj_match.group(0)

    # 3. Attempt Pipeline:
    # A. Direct Load
    try:
        json.loads(potential_raw)
        return potential_raw
    except json.JSONDecodeError:
        pass

    # B. Fix LaTeX/Backslash Escapes
    fixed_escapes = fix_json_escapes(potential_raw)
    try:
        json.loads(fixed_escapes)
        return fixed_escapes
    except json.JSONDecodeError:
        pass

    # C. Use json-repair (handles missing commas, quotes, trailing commas, etc.)
    repaired = repair_json(fixed_escapes)
    
    # Verify the repair actually produced valid JSON
    try:
        json.loads(repaired)
        return repaired
    except json.JSONDecodeError:
        # Last ditch effort: repair the original raw without our manual escape fixes
        repaired_raw = repair_json(potential_raw)
        return repaired_raw
