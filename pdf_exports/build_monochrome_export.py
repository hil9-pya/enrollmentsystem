from __future__ import annotations

import os
import subprocess
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas
from PIL import Image


ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "monochrome"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PDfTOPPM = Path(r"C:\Users\Ariel\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe")

FRAMES = [
    ("01-applicant-login-access", "01-applicant-login-access.pdf"),
    ("02-enrollment-registration", "02-enrollment-registration.pdf"),
    ("03-document-submission", "03-document-submission.pdf"),
    ("04-admissions-review", "04-admissions-review.pdf"),
    ("05-account-status", "05-account-status.pdf"),
    ("06-clearance-adviser", "06-clearance-adviser.pdf"),
    ("07-subject-schedule", "07-subject-schedule.pdf"),
    ("08-payment-accounting", "08-payment-accounting.pdf"),
    ("09-registrar-enrollment", "09-registrar-enrollment.pdf"),
    ("10-lms-academic-cycle", "10-lms-academic-cycle.pdf"),
    ("11-admin-term-close", "11-admin-term-close.pdf"),
]


def export_frame(stem: str, source_name: str) -> Path:
    source = ROOT / source_name
    prefix = OUT_DIR / stem
    png = Path(str(prefix) + "-1.png")
    subprocess.run(
        [str(PDfTOPPM), "-png", "-mono", "-r", "180", "-f", "1", "-l", "1", str(source), str(prefix)],
        check=True,
        capture_output=True,
    )
    image = Image.open(png).convert("1")
    reader = PdfReader(str(source))
    page = reader.pages[0]
    width = float(page.mediabox.width)
    height = float(page.mediabox.height)
    out = OUT_DIR / f"{stem}.pdf"
    c = Canvas(str(out), pagesize=(width, height))
    c.drawImage(ImageReader(image), 0, 0, width=width, height=height, preserveAspectRatio=True, mask="auto")
    c.showPage()
    c.save()
    image.close()
    png.unlink(missing_ok=True)
    return out


def main() -> None:
    pages = [export_frame(stem, source) for stem, source in FRAMES]
    combined = OUT_DIR / "NCST-enrollment-flow-monochrome.pdf"
    writer = PdfWriter()
    for page in pages:
        writer.append(str(page))
    with combined.open("wb") as handle:
        writer.write(handle)
    print(combined)
    print(f"pages={len(writer.pages)}")


if __name__ == "__main__":
    main()
