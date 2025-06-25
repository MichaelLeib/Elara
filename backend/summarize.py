from docx import Document
from ollama import Client
from tqdm import tqdm
import textwrap

# Init Ollama client
client = Client()

# Load .docx file
def load_docx(file_path):
    doc = Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])

# Chunk long text (adjust size for model limits)
def chunk_text(text, max_tokens=1000):
    return textwrap.wrap(text, width=max_tokens, break_long_words=False, replace_whitespace=False)

# Summarize each chunk and combine
def summarize_doc(doc_path, model="phi3:mini"):
    text = load_docx(doc_path)
    chunks = chunk_text(text, 1000)
    summaries = []

    for i, chunk in enumerate(tqdm(chunks, desc="Summarizing chunks")):
        prompt = f"Summarize this text:\n\n{chunk}. Specifically: Can I use AI Tools to help me with code development. And how?"
        response = client.chat(model=model, messages=[{"role": "user", "content": prompt}])
        summaries.append(response['message']['content'])

    final_prompt = "Summarize all this:\n\n" + "\n\n".join(summaries) + "Specifically: Can I use AI Tools to help me with code development. And how?"
    final_summary = client.chat(model=model, messages=[{"role": "user", "content": final_prompt}])
    return final_summary['message']['content']

# Example usage
if __name__ == "__main__":
    summary = summarize_doc("Anlage K KI-Richtlinien_DSEXTERN2025-06-19.docx", model="phi3:mini")
    print("\nFinal Summary:\n", summary)
