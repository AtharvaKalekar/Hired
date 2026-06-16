import re

def find_matching_brace(s: str, start_idx: int) -> int:
    """Finds the index of the matching closing brace '}' ignoring escaped ones."""
    depth = 0
    for i in range(start_idx, len(s)):
        if s[i] == '{':
            if i > 0 and s[i-1] == '\\':
                continue
            depth += 1
        elif s[i] == '}':
            if i > 0 and s[i-1] == '\\':
                continue
            depth -= 1
            if depth == 0:
                return i
    return -1

def escape_latex_string(s: str) -> str:
    """Deterministically escapes LaTeX special characters, preserving standard commands and already escaped characters."""
    saved_cmds = []
    
    # Helper to save inline LaTeX commands and escape their text parts recursively
    def save_cmd(match):
        cmd_type = match.group(1)  # "href" or "textbf" or "textit"
        if cmd_type == "href":
            url = match.group(2)
            text = match.group(3)
            escaped_text = escape_latex_string(text)
            saved_cmds.append(f"\\href{{{url}}}{{{escaped_text}}}")
        else:
            text = match.group(2)
            escaped_text = escape_latex_string(text)
            saved_cmds.append(f"\\{cmd_type}{{{escaped_text}}}")
        # Use a purely alphabetic placeholder to avoid special character escaping
        return f"PLACEHOLDERLATEXCMD{len(saved_cmds)-1}"
        
    res = s
    # Match inline formatting commands and save them
    res = re.sub(r"\\(href)\{([^}]+)\}\{([^}]+)\}", save_cmd, res)
    res = re.sub(r"\\(textbf|textit)\{([^}]+)\}", save_cmd, res)
    
    # Normalize already-escaped characters to purely alphabetic placeholders
    placeholders = {
        r"\&": "PLACEHOLDERAMP",
        r"\%": "PLACEHOLDERPCT",
        r"\$": "PLACEHOLDERDOL",
        r"\#": "PLACEHOLDERHASH",
        r"\_": "PLACEHOLDERUND",
        r"\{": "PLACEHOLDERLBR",
        r"\}": "PLACEHOLDERRBR",
        r"\~": "PLACEHOLDERTIL",
        r"\^": "PLACEHOLDERCRT",
        r"\backslash{}": "PLACEHOLDERBSL",
        r"\textasciitilde{}": "PLACEHOLDERTAT",
        r"\textasciicircum{}": "PLACEHOLDERTAC",
        r"\sim": "PLACEHOLDERSIM"
    }
    
    for esc, ph in placeholders.items():
        res = res.replace(esc, ph)
        
    # Escape raw backslash to a temporary alphabetic placeholder first
    res = res.replace("\\", "PLACEHOLDERRAWBSL")
    
    # Escape other raw special characters
    special_replacements = {
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}"
    }
    for char, esc in special_replacements.items():
        res = res.replace(char, esc)
        
    # Replace raw backslash placeholder with \textbackslash{}
    res = res.replace("PLACEHOLDERRAWBSL", r"\textbackslash{}")
    
    # Escape ~ and ^
    res = res.replace("~", r"\textasciitilde{}")
    res = res.replace("^", r"\textasciicircum{}")
    
    # Restore placeholders
    for esc, ph in placeholders.items():
        res = res.replace(ph, esc)
        
    # Restore saved commands
    for idx, cmd in enumerate(saved_cmds):
        res = res.replace(f"PLACEHOLDERLATEXCMD{idx}", cmd)
        
    # Clean up C++ / C# / C+ escaping issues
    res = res.replace(r"C\+\+", "C++")
    res = res.replace(r"C\+", "C+")
    res = res.replace(r"C\#", "C#")
    
    return res

def sanitize_latex_document(latex_code: str) -> str:
    """Parses a complete LaTeX document and escapes user-dynamic sections only, preserving the preamble."""
    doc_start = latex_code.find(r"\begin{document}")
    if doc_start == -1:
        preamble = ""
        body = latex_code
    else:
        preamble = latex_code[:doc_start]
        body = latex_code[doc_start:]

    i = 0
    n = len(body)
    res = []
    
    # Helper to extract and escape macro arguments on the body
    def get_and_escape_args(idx, num_args, escape_mask):
        curr = idx
        args_out = []
        for arg_idx in range(num_args):
            start_brace = body.find('{', curr)
            if start_brace == -1 or start_brace > curr + 15:
                break
            end_brace = find_matching_brace(body, start_brace)
            if end_brace == -1:
                break
            arg_content = body[start_brace+1 : end_brace]
            
            if escape_mask[arg_idx]:
                # Special check: if project heading name contains textbf, escape only project name
                if arg_content.startswith(r"\textbf{") and arg_content.endswith("}"):
                    inner_content = arg_content[len(r"\textbf{"):-1]
                    escaped_content = r"\textbf{" + escape_latex_string(inner_content) + "}"
                else:
                    escaped_content = escape_latex_string(arg_content)
            else:
                escaped_content = arg_content
                
            args_out.append(body[curr:start_brace] + "{" + escaped_content + "}")
            curr = end_brace + 1
            
        if len(args_out) == num_args:
            return "".join(args_out), curr
        return None, idx

    while i < n:
        if body.startswith(r"\resumeItem", i):
            args_str, next_i = get_and_escape_args(i + len(r"\resumeItem"), 1, [True])
            if args_str is not None:
                res.append(r"\resumeItem" + args_str)
                i = next_i
                continue
        elif body.startswith(r"\resumeSubheading", i):
            args_str, next_i = get_and_escape_args(i + len(r"\resumeSubheading"), 4, [True, True, True, True])
            if args_str is not None:
                res.append(r"\resumeSubheading" + args_str)
                i = next_i
                continue
        elif body.startswith(r"\resumeProjectHeading", i):
            args_str, next_i = get_and_escape_args(i + len(r"\resumeProjectHeading"), 2, [True, True])
            if args_str is not None:
                res.append(r"\resumeProjectHeading" + args_str)
                i = next_i
                continue
        elif body.startswith(r"\resumeSubSubheading", i):
            args_str, next_i = get_and_escape_args(i + len(r"\resumeSubSubheading"), 2, [True, True])
            if args_str is not None:
                res.append(r"\resumeSubSubheading" + args_str)
                i = next_i
                continue
        elif body.startswith(r"\href", i):
            args_str, next_i = get_and_escape_args(i + len(r"\href"), 2, [False, True])
            if args_str is not None:
                res.append(r"\href" + args_str)
                i = next_i
                continue
        elif body.startswith(r"\section{PROFESSIONAL SUMMARY}", i):
            res.append(r"\section{PROFESSIONAL SUMMARY}")
            i += len(r"\section{PROFESSIONAL SUMMARY}")
            next_sec = body.find(r"\section", i)
            if next_sec == -1:
                next_sec = n
            summary_block = body[i:next_sec]
            escaped_summary = escape_latex_string(summary_block)
            res.append(escaped_summary)
            i = next_sec
            continue
            
        res.append(body[i])
        i += 1
        
    doc = preamble + "".join(res)
    
    # Escape technical skill listings inside lists
    def repl_skills(match):
        category = match.group(1)
        content = match.group(2)
        escaped_content = escape_latex_string(content)
        return f"\\textbf{{{category}}} : {escaped_content}"
        
    categories_pattern = r"\\textbf\{(Languages|Technologies|Tools|Frameworks|Databases|Platforms|Libraries|Methodologies)\}\s*:\s*([^\\}\n]+)"
    doc = re.sub(categories_pattern, repl_skills, doc)
    
    # Correct common LLM option typos in itemize environments (e.g., noitemsep(topsep=0pt) -> noitemsep,topsep=0pt)
    doc = re.sub(r'noitemsep\(topsep=([^)]+)\)', r'noitemsep,topsep=\1', doc)
    
    return doc
