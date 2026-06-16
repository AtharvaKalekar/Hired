import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "tools"))

from latex_sanitizer import sanitize_latex_document, escape_latex_string

def test_sanitizer():
    # Test cases for inline escape_latex_string
    print("Testing escape_latex_string...")
    
    test_cases = [
        ("Research & Development", r"Research \& Development"),
        ("100% successful", r"100\% successful"),
        ("user_id_field", r"user\_id\_field"),
        ("C++ Developer", "C++ Developer"),
        ("C# Program", "C# Program"),
        (r"C:\path\to\file", r"C:\textbackslash{}path\textbackslash{}to\textbackslash{}file"),
        ("Hello & World _ Test %", r"Hello \& World \_ Test \%"),
        (r"Already \& Escaped \% Characters", r"Already \& Escaped \% Characters"),
        (r"\textbf{Bold Text & Co.}", r"\textbf{Bold Text \& Co.}"),
        (r"\href{http://url.com}{Link & Description}", r"\href{http://url.com}{Link \& Description}"),
        (r"Nested \textit{italic _ text} check", r"Nested \textit{italic \_ text} check"),
    ]
    
    all_ok = True
    for inp, expected in test_cases:
        out = escape_latex_string(inp)
        if out != expected:
            print(f"FAIL: {inp!r}\n  Expected: {expected!r}\n  Got:      {out!r}")
            all_ok = False
        else:
            print(f"PASS: {inp!r} -> {out!r}")
            
    print("\nTesting sanitize_latex_document...")
    doc = r"""
\documentclass{article}
\begin{document}
\section{PROFESSIONAL SUMMARY}
I did Research & Development with 100% success on user_id projects.

\section{EXPERIENCE}
\resumeSubheading{Awesome & Co}{Location_Name}{Senior & Lead Developer}{June 2026}
\resumeItemListStart
\resumeItem{Completed 50% of the backend work & optimized database queries.}
\resumeItem{Built \href{http://github.com/my_repo}{My_Project} with C++ & Go.}
\resumeItemListEnd

\section{PROJECTS}
\resumeProjectHeading{\textbf{Project_Name & Co}}{2026}

\section{SKILLS}
\textbf{Languages} : Python, Java, C++, HTML & CSS\vspace{2pt} \\
\textbf{Technologies} : React, Node.js, Express & MongoDB\vspace{2pt} \\
\textbf{Tools}     : Git, Docker, Kubernetes & AWS
\end{document}
"""
    
    sanitized = sanitize_latex_document(doc)
    print("Sanitized document output:")
    print(sanitized)
    
    # Assertions
    assert r"Research \& Development" in sanitized
    assert r"100\% success" in sanitized
    assert r"user\_id" in sanitized
    assert r"Awesome \& Co" in sanitized
    assert r"Location\_Name" in sanitized
    assert r"Senior \& Lead Developer" in sanitized
    assert r"50\% of the backend" in sanitized
    assert r"work \& optimized" in sanitized
    assert r"My\_Project" in sanitized
    assert r"C++ \& Go" in sanitized
    assert r"Project\_Name \& Co" in sanitized
    assert r"HTML \& CSS" in sanitized
    assert r"Express \& MongoDB" in sanitized
    assert r"Kubernetes \& AWS" in sanitized
    assert r"C++" in sanitized
    assert r"C\+\+" not in sanitized
    print("\nALL SANITIZATION TESTS PASSED!")

if __name__ == "__main__":
    test_sanitizer()
