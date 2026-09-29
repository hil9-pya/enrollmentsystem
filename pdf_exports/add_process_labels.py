from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader, PdfWriter, Transformation
from pypdf._page import PageObject
from reportlab.lib.colors import black
from reportlab.pdfgen.canvas import Canvas


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "monochrome" / "NCST-enrollment-flow-monochrome.pdf"
OUTPUT = ROOT / "monochrome" / "NCST-enrollment-flow-monochrome-labeled.pdf"
LABELS = [
    "PROCESS 01 | APPLICANT LOGIN AND ACCESS",
    "PROCESS 02 | ENROLLMENT TYPE AND REGISTRATION",
    "PROCESS 03 | DOCUMENT CHECKLIST AND SUBMISSION",
    "PROCESS 04 | ADMISSIONS REVIEW AND DECISION",
    "PROCESS 05 | ACCOUNT ACTIVATION AND STATUS",
    "PROCESS 06 | CLEARANCE AND ADVISER EVALUATION",
    "PROCESS 07 | SUBJECT ENROLLMENT AND SCHEDULE",
    "PROCESS 08 | PAYMENT AND ACCOUNTING",
    "PROCESS 09 | REGISTRAR VALIDATION AND ENROLLMENT",
    "PROCESS 10 | LMS DELIVERY AND ACADEMIC CYCLE",
    "PROCESS 11 | ADMIN OPERATIONS AND TERM CLOSE",
]
LABEL_HEIGHT = 36


def label_page(page: PageObject, label: str) -> PageObject:
    width = float(page.mediabox.width)
    height = float(page.mediabox.height)
    page.add_transformation(Transformation().translate(tx=0, ty=LABEL_HEIGHT))
    result = PageObject.create_blank_page(width=width, height=height + LABEL_HEIGHT)
    result.merge_page(page)
    overlay_path = ROOT / "monochrome" / "_label_overlay.pdf"
    canvas = Canvas(str(overlay_path), pagesize=(width, height + LABEL_HEIGHT))
    canvas.setFillColor(black)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(24, height + 13, label)
    canvas.save()
    overlay = PdfReader(str(overlay_path)).pages[0]
    result.merge_page(overlay)
    overlay_path.unlink(missing_ok=True)
    return result


def main() -> None:
    reader = PdfReader(str(SOURCE))
    writer = PdfWriter()
    for page, label in zip(reader.pages, LABELS):
        writer.add_page(label_page(page, label))
    with OUTPUT.open("wb") as handle:
        writer.write(handle)
    print(OUTPUT)
    print(f"pages={len(writer.pages)}")


if __name__ == "__main__":
    main()
