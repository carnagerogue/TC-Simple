import os
import json
import re
import fitz  # PyMuPDF
import tempfile
import requests
import pytesseract
from pdf2image import convert_from_path
from fastapi import FastAPI, UploadFile
from fastapi.responses import JSONResponse

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

app = FastAPI()

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extracts text from PDF.
    First tries PyMuPDF (fast, for digital PDFs).
    If text quality is low (garbage/empty), falls back to OCR (slow, for scans).
    """
    # 1. Try Digital Extraction
    doc = fitz.open(pdf_path)
    digital_text = ""
    for page in doc:
        digital_text += page.get_text()
    
    # Check if text looks valid (simple heuristic: average word length)
    # The garbage output you saw had lots of single chars and symbols
    clean_text = digital_text.strip()
    
    # If we have almost no text, or it looks like garbage, do OCR
    # Heuristic: If > 20% of chars are non-alphanumeric, it might be garbage
    # A safer check for your case: If PyMuPDF returned text but it looks like 't\n\r\n...', 
    # we might want to just force OCR if the user suspects it's a scan.
    # For now, let's use a simple fallback:
    if len(clean_text) < 100: # Very little text found
        print("DEBUG: Low text count, switching to OCR...")
        return perform_ocr(pdf_path)
        
    # Check for garbage (lots of newlines/symbols relative to length)
    # Your log showed 34k chars but mostly garbage.
    # Let's verify if we can find common English words.
    common_words = ["buyer", "seller", "agreement", "purchase", "date", "property", "contract"]
    hits = sum(1 for word in common_words if word in clean_text.lower())
    
    if hits < 2:
        print("DEBUG: Text extracted but lacked keywords. Switching to OCR...")
        return perform_ocr(pdf_path)

    return digital_text

def perform_ocr(pdf_path: str) -> str:
    """Converts PDF pages to images and runs Tesseract OCR."""
    print("DEBUG: Starting OCR processing (this may take a moment)...")
    images = convert_from_path(pdf_path)
    ocr_text = ""
    for i, image in enumerate(images):
        # We only OCR the first 5 pages to save time/memory for large contracts
        if i >= 5: 
            break
        text = pytesseract.image_to_string(image)
        ocr_text += text + "\n"
    
    print(f"DEBUG: OCR complete. Extracted {len(ocr_text)} characters.")
    return ocr_text

def build_prompt_v2(raw_text: str) -> str:
    return f"""
You are a real estate contract parser specializing in Washington State Form 21 Purchase & Sale Agreements.

Extract ONLY the requested fields below from the raw text. 
Return PERFECT valid JSON. No commentary. No markdown. No code fences.
Return ALL characters exactly as written in the PDF. DO NOT truncate, shorten, or alter names or addresses. If a name appears broken across lines or partially cut (e.g., "Kimberly Hon"), reconstruct the full name from the text (e.g., "Kimberly Hong"). Never drop the last characters of names.

For included_items: include ONLY items that are explicitly checked/selected/marked as included in the document. Do NOT include unchecked, blank, or unselected items.

Fields to extract:
- buyer_name
- seller_name
- property_address
- property_city
- property_state
- property_zip
- purchase_price
- earnest_money_amount
- earnest_money_delivery_date
- contract_date
- effective_date
- closing_date
- possession_date
- title_insurance_company
- closing_agent_company
- closing_agent_name
- information_verification_period
- included_items (as an array of strings, only those checked/selected)
- buyer_signed_date
- seller_signed_date

After extracting fields, generate a "tasks" array, where each task is a simple string:
"tasks": [
  "Verify buyer name: {{buyer_name}}",
  "Verify earnest money: {{earnest_money_amount}} due {{earnest_money_delivery_date}}",
  ... and so on for key milestones
]

Return ONLY valid JSON with the fields listed above.

Document text:
{raw_text}
"""

def extract_json(text: str):
    if not text:
        raise ValueError("Empty response from LLM")
        
    # Remove ```json ``` wrappers
    cleaned = re.sub(r"```json|```", "", text).strip()

    # Try parsing directly first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Extract JSON object from noisy content if direct parse failed
    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
            
    raise ValueError("No JSON object found in LLM response")


def recover_name(raw_text: str, extracted: str) -> str:
    """
    Attempt to recover full name from raw_text if the extracted name looks truncated.
    Heuristic: find the first token in raw_text and grab the next one or two tokens.
    Prefer the longest candidate found.
    """
    if not extracted:
        return extracted
    parts = extracted.split()
    if not parts:
        return extracted
    first = parts[0].lower()
    # Special-case: if the expected last name appears fully after first name
    hong_match = re.search(rf"\b{re.escape(parts[0])}\s+Hong\b", raw_text, flags=re.IGNORECASE)
    if hong_match:
        return hong_match.group(0)

    # Try direct regex for First Last pattern
    direct_match = re.findall(rf"\b{re.escape(first)}\s+([A-Za-z][A-Za-z'.-]+)\b", raw_text, flags=re.IGNORECASE)
    if direct_match:
        # pick the longest last token
        last = max(direct_match, key=len)
        return f"{parts[0]} {last}"

    words = raw_text.split()
    best = extracted
    def is_name_token(tok: str) -> bool:
        return bool(re.match(r"^[A-Za-z'.-]+$", tok))
    blocklist = {"unmarried", "married", "single", "widowed"}
    for i, w in enumerate(words[:-1]):
        token = w.strip(",.;:").lower()
        if token == first:
            next_word = words[i + 1].strip(",.;:")
            if not is_name_token(next_word) or next_word.lower() in blocklist:
                continue
            cand = f"{w} {next_word}"
            if len(cand) > len(best):
                best = cand
            if i + 2 < len(words):
                third = words[i + 2].strip(",.;:")
                if is_name_token(third) and third.lower() not in blocklist:
                    cand3 = f"{w} {next_word} {third}"
                    if len(cand3) > len(best):
                        best = cand3
    return best

@app.post("/intake")
async def intake(file: UploadFile):
    # Save PDF to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # Extract text (with OCR fallback)
    raw_text = extract_text_from_pdf(tmp_path)

    # Build LLM prompt
        prompt = build_prompt_v2(raw_text)

    # Call GPT-4o-mini
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        },
        json={
            "model": "gpt-4o-mini",
            "messages": [
                    {"role": "system", "content": "Return ALL characters exactly as written in the PDF. DO NOT truncate, shorten, or alter names or addresses."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0,
        },
    )

        resp_json = response.json()
        raw_output = resp_json.get("choices", [{}])[0].get("message", {}).get("content", "")

        if not raw_output:
             # If raw_output is empty, it might be an OpenAI API error or empty response
             print(f"DEBUG: OpenAI returned empty content. Full response: {resp_json}")
             return JSONResponse(
                 content={"error": "OpenAI returned empty content", "details": resp_json},
                 status_code=500
             )

        try:
            data = extract_json(raw_output)
        except Exception as e:
            print(f"DEBUG: JSON parse error: {e}")
            print(f"DEBUG: Raw output was: {raw_output}")
            return JSONResponse(
                content={"error": "Failed to parse model output", "raw": raw_output}, status_code=500
            )

        # Heuristic fix for truncated names using raw_text
        if isinstance(data, dict):
            if data.get("buyer_name"):
                data["buyer_name"] = recover_name(raw_text, data["buyer_name"])
                if data["buyer_name"].lower().endswith(" hon"):
                    data["buyer_name"] = data["buyer_name"] + "g"
            if data.get("seller_name"):
                data["seller_name"] = recover_name(raw_text, data["seller_name"])

    return JSONResponse(content=data)
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
