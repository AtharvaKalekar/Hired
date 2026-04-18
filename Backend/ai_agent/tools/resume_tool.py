import os
import fitz  # PyMuPDF
from crewai.tools import tool


@tool("Parse Resume PDF")
def parse_resume(file_path: str) -> str:
    """
    Extracts and returns the raw text content from a PDF resume file.
    Takes the absolute or relative file path to the PDF as input.
    Returns a clean, formatted text representation of the resume.
    """
    if not os.path.exists(file_path):
        return f"Error: File not found at path '{file_path}'. Please provide a valid path."

    if not file_path.lower().endswith(".pdf"):
        return f"Error: File '{file_path}' does not appear to be a PDF."

    try:
        doc = fitz.open(file_path)
        pages_text = []
        for i, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            if text:
                pages_text.append(f"--- Page {i} ---\n{text}")
        doc.close()

        if not pages_text:
            return "Warning: PDF was opened but no text could be extracted. It may be image-based (scanned)."

        result = f"=== Resume Content from: {os.path.basename(file_path)} ===\n\n"
        result += "\n\n".join(pages_text)
        return result

    except Exception as e:
        return f"Error parsing PDF resume: {e}"
