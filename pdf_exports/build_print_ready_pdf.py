from __future__ import annotations

import os
from textwrap import wrap

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen.canvas import Canvas


W, H = letter
MARGIN = 34
HEADER_H = 58
FOOTER_H = 30
NAVY = HexColor("#12355B")
BLUE = HexColor("#1769AA")
INK = HexColor("#17202A")
MUTED = HexColor("#5B6770")
LINE = HexColor("#72808D")
PALE_BLUE = HexColor("#EAF4FF")
PALE_AMBER = HexColor("#FFF4D6")
PALE_TEAL = HexColor("#E6FFFA")
PALE_PURPLE = HexColor("#F2E8FF")
PALE_GRAY = HexColor("#F3F4F6")
PALE_RED = HexColor("#FDECEC")
PALE_REF = HexColor("#F7F7F7")


def text_lines(text: str, width: float, font: str, size: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and stringWidth(candidate, font, size) > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines or [""]


def centered_text(c: Canvas, text: str, x: float, y: float, w: float, h: float, size: float = 8.6) -> None:
    font = "Helvetica-Bold"
    lines = text_lines(text, w - 12, font, size)
    leading = size + 2
    total = len(lines) * leading
    baseline = y + (h + total) / 2 - leading
    c.setFillColor(INK)
    c.setFont(font, size)
    for line in lines:
        c.drawCentredString(x + w / 2, baseline, line)
        baseline -= leading


def polygon(c: Canvas, points: list[tuple[float, float]], fill, stroke=LINE) -> None:
    path = c.beginPath()
    path.moveTo(*points[0])
    for point in points[1:]:
        path.lineTo(*point)
    path.close()
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(1.2)
    c.drawPath(path, fill=1, stroke=1)


def draw_document(c: Canvas, x: float, y: float, w: float, h: float, fill) -> None:
    fold = min(12, w * 0.18)
    polygon(c, [(x, y), (x + w, y), (x + w, y + h - fold), (x + w - fold, y + h), (x, y + h)], fill)
    c.setStrokeColor(LINE)
    c.line(x + w - fold, y + h, x + w - fold, y + h - fold)
    c.line(x + w - fold, y + h - fold, x + w, y + h - fold)


def draw_shape(c: Canvas, x: float, y: float, w: float, h: float, label: str, kind: str, fill=white) -> None:
    c.saveState()
    c.setLineWidth(1.2)
    if kind == "rect":
        c.setFillColor(fill); c.setStrokeColor(LINE); c.rect(x, y, w, h, fill=1, stroke=1)
    elif kind == "rounded":
        c.setFillColor(fill); c.setStrokeColor(LINE); c.roundRect(x, y, w, h, 10, fill=1, stroke=1)
    elif kind == "stadium":
        c.setFillColor(fill); c.setStrokeColor(LINE); c.roundRect(x, y, w, h, h / 2, fill=1, stroke=1)
    elif kind == "circle":
        c.setFillColor(fill); c.setStrokeColor(LINE); c.circle(x + w / 2, y + h / 2, min(w, h) / 2, fill=1, stroke=1)
    elif kind == "diamond":
        polygon(c, [(x + w / 2, y + h), (x + w, y + h / 2), (x + w / 2, y), (x, y + h / 2)], fill)
    elif kind == "hex":
        s = w * 0.16
        polygon(c, [(x + s, y), (x + w - s, y), (x + w, y + h / 2), (x + w - s, y + h), (x + s, y + h), (x, y + h / 2)], fill)
    elif kind == "subroutine":
        c.setFillColor(fill); c.setStrokeColor(LINE); c.rect(x, y, w, h, fill=1, stroke=1)
        c.line(x + 7, y, x + 7, y + h); c.line(x + w - 7, y, x + w - 7, y + h)
    elif kind == "cylinder":
        c.setFillColor(fill); c.setStrokeColor(LINE)
        c.rect(x, y + 7, w, h - 14, fill=1, stroke=1)
        c.ellipse(x, y + h - 14, x + w, y + h, fill=1, stroke=1)
        c.ellipse(x, y, x + w, y + 14, fill=1, stroke=1)
    elif kind == "input":
        skew = 12
        polygon(c, [(x + skew, y), (x + w, y), (x + w - skew, y + h), (x, y + h)], fill)
    elif kind == "output":
        skew = 12
        polygon(c, [(x, y), (x + w - skew, y), (x + w, y + h), (x + skew, y + h)], fill)
    elif kind == "trap":
        inset = 14
        polygon(c, [(x + inset, y), (x + w - inset, y), (x + w, y + h), (x, y + h)], fill)
    elif kind == "chevron":
        cut = 18
        polygon(c, [(x, y), (x + w - cut, y), (x + w, y + h / 2), (x + w - cut, y + h), (x, y + h), (x + cut, y + h / 2)], fill)
    elif kind == "doc":
        draw_document(c, x, y, w, h, fill)
    elif kind == "docs":
        draw_document(c, x + 5, y + 5, w - 5, h - 5, HexColor("#E4E9EE"))
        draw_document(c, x, y, w - 5, h - 5, fill)
    elif kind == "warning":
        polygon(c, [(x + w / 2, y + h), (x + w, y), (x, y)], fill)
    elif kind == "close":
        polygon(c, [(x, y + h), (x + w, y + h), (x + w / 2, y)], fill)
    elif kind == "milestone":
        inset = 12
        polygon(c, [(x + inset, y), (x + w - inset, y), (x + w, y + h / 2), (x + w - inset, y + h), (x + inset, y + h), (x, y + h / 2)], fill)
    elif kind == "note":
        c.setFillColor(fill); c.setStrokeColor(LINE); c.roundRect(x, y + 5, w, h - 5, 8, fill=1, stroke=1)
        polygon(c, [(x + w * .25, y + 5), (x + w * .38, y - 3), (x + w * .45, y + 5)], fill)
    elif kind == "merge":
        c.setFillColor(fill); c.setStrokeColor(LINE); c.circle(x + w / 2, y + h / 2, min(w, h) / 2, fill=1, stroke=1)
        c.line(x + w * .28, y + h * .28, x + w * .72, y + h * .72)
        c.line(x + w * .72, y + h * .28, x + w * .28, y + h * .72)
    elif kind == "delay":
        c.setFillColor(fill); c.setStrokeColor(LINE); c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
    centered_text(c, label, x, y, w, h, 8.2)
    c.restoreState()


def arrow(c: Canvas, x1: float, y1: float, x2: float, y2: float, label: str = "", dashed: bool = False) -> None:
    c.saveState()
    c.setStrokeColor(LINE)
    c.setFillColor(LINE)
    c.setLineWidth(1.1)
    if dashed:
        c.setDash(4, 3)
    c.line(x1, y1, x2, y2)
    import math
    angle = math.atan2(y2 - y1, x2 - x1)
    size = 5
    p1 = (x2, y2)
    p2 = (x2 - size * math.cos(angle - .5), y2 - size * math.sin(angle - .5))
    p3 = (x2 - size * math.cos(angle + .5), y2 - size * math.sin(angle + .5))
    polygon(c, [p1, p2, p3], LINE, LINE)
    if label:
        c.setDash()
        c.setFont("Helvetica", 7.2)
        c.setFillColor(MUTED)
        c.drawCentredString((x1 + x2) / 2, (y1 + y2) / 2 + 4, label)
    c.restoreState()


def draw_header(c: Canvas, page_no: int, title: str, owner: str, input_text: str, output_text: str, bg) -> None:
    c.setFillColor(bg); c.roundRect(MARGIN, FOOTER_H + 7, W - 2 * MARGIN, H - HEADER_H - FOOTER_H - 14, 12, fill=1, stroke=0)
    c.setFillColor(NAVY); c.rect(0, H - HEADER_H, W, HEADER_H, fill=1, stroke=0)
    c.setFillColor(white); c.setFont("Helvetica-Bold", 13); c.drawString(MARGIN, H - 24, "NCST ENROLLMENT SYSTEM")
    c.setFont("Helvetica-Bold", 10); c.drawRightString(W - MARGIN, H - 24, f"PORTRAIT PDF PAGE {page_no:02d}")
    c.setFont("Helvetica-Bold", 11); c.drawString(MARGIN, H - 43, title)
    c.setFillColor(MUTED); c.setFont("Helvetica", 7.5)
    c.drawString(MARGIN + 4, H - HEADER_H - 15, f"OWNER: {owner}")
    c.drawString(MARGIN + 4, H - HEADER_H - 27, f"INPUT: {input_text}")
    c.drawString(MARGIN + 4, H - HEADER_H - 39, f"OUTPUT: {output_text}")


def draw_footer(c: Canvas, page_no: int, next_label: str) -> None:
    c.setStrokeColor(HexColor("#D7DEE5")); c.line(MARGIN, FOOTER_H, W - MARGIN, FOOTER_H)
    c.setFillColor(MUTED); c.setFont("Helvetica-Bold", 7.4)
    c.drawString(MARGIN, 12, f"NCST FLOW | PAGE {page_no:02d} OF 12 | LETTER / BOND PORTRAIT")
    c.drawRightString(W - MARGIN, 12, next_label)


def draw_flow_page(c: Canvas, page_no: int, spec: dict) -> None:
    draw_header(c, page_no, spec["title"], spec["owner"], spec["input"], spec["output"], spec["bg"])
    node_w, node_h, gap = 188, 40, 10
    x = (W - node_w) / 2
    top = H - HEADER_H - 64
    boxes = []
    for i, node in enumerate(spec["nodes"]):
        y = top - i * (node_h + gap) - node_h
        draw_shape(c, x, y, node_w, node_h, node["label"], node["kind"], node.get("fill", white))
        boxes.append((x, y, node_w, node_h))
        if i:
            prev = boxes[i - 1]
            arrow(c, x + node_w / 2, prev[1], x + node_w / 2, y + node_h)
    for side in spec.get("side", []):
        sx = 46 if side["side"] == "left" else W - 46 - 150
        sy = side["y"]
        sw, sh = 150, 42
        draw_shape(c, sx, sy, sw, sh, side["label"], side.get("kind", "note"), side.get("fill", white))
        ax, ay, aw, ah = boxes[side["anchor"]]
        start = (ax, ay + ah / 2) if side["side"] == "left" else (ax + aw, ay + ah / 2)
        target = (sx + sw, sy + sh / 2) if side["side"] == "left" else (sx, sy + sh / 2)
        arrow(c, *start, *target, side.get("edge", ""), dashed=True)
        if "return_to" in side:
            tx, ty, tw, th = boxes[side["return_to"]]
            arrow(c, target[0], target[1], tx + tw / 2, ty + th / 2, side.get("return_label", ""), dashed=True)
    draw_footer(c, page_no, spec["next"])
    c.showPage()


PAGES = [
    dict(title="APPLICANT LOGIN AND ACCESS", owner="Applicant", input="Public landing page", output="Authenticated session", bg=PALE_BLUE, next="CONTINUE TO PAGE 02", nodes=[
        {"label":"PROCESS 01 START", "kind":"stadium"}, {"label":"Applicant opens NCST landing", "kind":"input"}, {"label":"NCST gateway and session check", "kind":"rounded"}, {"label":"Applicant login?", "kind":"diamond"}, {"label":"Enter applicant credentials", "kind":"rect"}, {"label":"Send access OTP", "kind":"subroutine"}, {"label":"OTP valid?", "kind":"diamond"}, {"label":"Create authenticated session", "kind":"rounded"}, {"label":"PAGE BREAK | CONTINUE TO PAGE 02", "kind":"chevron"}], side=[
        {"anchor":3, "side":"left", "y":350, "label":"No: route to other portal", "kind":"chevron", "edge":"No"}, {"anchor":6, "side":"right", "y":248, "label":"No: retry login or OTP", "kind":"delay", "edge":"No", "return_to":4, "return_label":"Retry"}]),
    dict(title="ENROLLMENT TYPE AND REGISTRATION", owner="Applicant", input="Authenticated session", output="Registration draft", bg=PALE_BLUE, next="CONTINUE TO PAGE 03", nodes=[
        {"label":"RECEIVE FROM PAGE 01", "kind":"chevron"}, {"label":"New or continuing applicant?", "kind":"diamond"}, {"label":"Prepare selected profile", "kind":"hex"}, {"label":"Registration path merged", "kind":"merge"}, {"label":"Choose program and academic term", "kind":"rect"}, {"label":"Enter personal and academic details", "kind":"input"}, {"label":"Complete registration form", "kind":"subroutine"}, {"label":"Duplicate registration found?", "kind":"diamond"}, {"label":"Registration draft record", "kind":"cylinder"}, {"label":"PAGE BREAK | CONTINUE TO PAGE 03", "kind":"chevron"}], side=[
        {"anchor":1, "side":"left", "y":500, "label":"Continuing: load prior record", "kind":"note", "edge":"Continuing"}, {"anchor":7, "side":"right", "y":245, "label":"Yes: correct details", "kind":"trap", "edge":"Yes", "return_to":5, "return_label":"Fix"}]),
    dict(title="DOCUMENT CHECKLIST AND SUBMISSION", owner="Applicant", input="Registration draft", output="Submitted application", bg=PALE_BLUE, next="CONTINUE TO PAGE 04", nodes=[
        {"label":"RECEIVE FROM PAGE 02", "kind":"chevron"}, {"label":"Required-document checklist", "kind":"docs"}, {"label":"Upload each required document", "kind":"input"}, {"label":"File type and size valid?", "kind":"diamond"}, {"label":"Document packet complete?", "kind":"diamond"}, {"label":"Secure document storage", "kind":"cylinder"}, {"label":"Submit application for review", "kind":"rect"}, {"label":"PAGE BREAK | CONTINUE TO PAGE 04", "kind":"chevron"}], side=[
        {"anchor":3, "side":"left", "y":390, "label":"No: replace invalid file", "kind":"trap", "edge":"No", "return_to":2, "return_label":"Replace"}, {"anchor":4, "side":"right", "y":310, "label":"No: show missing-document guidance", "kind":"note", "edge":"No", "return_to":2, "return_label":"Upload"}]),
    dict(title="ADMISSIONS REVIEW AND DECISION", owner="Admissions", input="Submitted application", output="Acceptance or resubmission", bg=PALE_AMBER, next="CONTINUE TO PAGE 05", nodes=[
        {"label":"RECEIVE FROM PAGE 03", "kind":"chevron"}, {"label":"Application review queue", "kind":"input"}, {"label":"Assign admissions reviewer", "kind":"rect"}, {"label":"Review identity and documents", "kind":"subroutine"}, {"label":"Review packet complete?", "kind":"diamond"}, {"label":"Applicant eligible?", "kind":"diamond"}, {"label":"Issue acceptance letter", "kind":"doc"}, {"label":"Admissions decision record", "kind":"cylinder"}, {"label":"PAGE BREAK | CONTINUE TO PAGE 05", "kind":"chevron"}], side=[
        {"anchor":4, "side":"left", "y":350, "label":"No: reject with reason", "kind":"trap", "edge":"No"}, {"anchor":5, "side":"left", "y":245, "label":"No: return to page 03", "kind":"chevron", "edge":"No", "return_to":1, "return_label":"Resubmit"}]),
    dict(title="ACCOUNT ACTIVATION AND STATUS", owner="Admissions / Applicant", input="Acceptance decision", output="Advising-ready account", bg=PALE_AMBER, next="CONTINUE TO PAGE 06", nodes=[
        {"label":"RECEIVE ACCEPTANCE FROM PAGE 04", "kind":"chevron"}, {"label":"Display acceptance letter", "kind":"doc"}, {"label":"Create student account", "kind":"subroutine"}, {"label":"Send account activation email", "kind":"input"}, {"label":"Email verified?", "kind":"diamond"}, {"label":"Student and user record", "kind":"cylinder"}, {"label":"New or continuing pathway?", "kind":"diamond"}, {"label":"Set advising status", "kind":"rect"}, {"label":"ADVISING READY", "kind":"milestone"}, {"label":"Notify applicant of next action", "kind":"note"}, {"label":"PAGE BREAK | CONTINUE TO PAGE 06", "kind":"chevron"}], side=[
        {"anchor":4, "side":"right", "y":350, "label":"No: resend activation link", "kind":"delay", "edge":"No", "return_to":3, "return_label":"Resend"}, {"anchor":6, "side":"left", "y":245, "label":"Continuing: advising pending", "kind":"note", "edge":"Continuing"}]),
    dict(title="CLEARANCE AND ADVISER EVALUATION", owner="Student / Adviser", input="Advising-ready account", output="Approved academic plan", bg=PALE_TEAL, next="CONTINUE TO PAGE 07", nodes=[
        {"label":"RECEIVE FROM PAGE 05", "kind":"chevron"}, {"label":"Check holds and deficiencies", "kind":"warning"}, {"label":"Any blocking hold?", "kind":"diamond"}, {"label":"Clear finance, health, and discipline holds", "kind":"rect"}, {"label":"Run course evaluation", "kind":"subroutine"}, {"label":"Adviser reviews academic plan", "kind":"rect"}, {"label":"Adviser approved?", "kind":"diamond"}, {"label":"ADVISING COMPLETE", "kind":"milestone"}, {"label":"PAGE BREAK | CONTINUE TO PAGE 07", "kind":"chevron"}], side=[
        {"anchor":6, "side":"left", "y":315, "label":"No: return for subject changes", "kind":"trap", "edge":"No", "return_to":4, "return_label":"Revise"}, {"anchor":2, "side":"right", "y":430, "label":"No hold: continue evaluation", "kind":"note", "edge":"No", "return_to":4, "return_label":"Continue"}]),
    dict(title="SUBJECT ENROLLMENT AND SCHEDULE", owner="Student / Adviser", input="Approved academic plan", output="Approved subject list", bg=PALE_TEAL, next="CONTINUE TO PAGE 08", nodes=[
        {"label":"RECEIVE FROM PAGE 06", "kind":"chevron"}, {"label":"Term course catalog", "kind":"cylinder"}, {"label":"Select subjects and sections", "kind":"rect"}, {"label":"Prerequisites valid?", "kind":"diamond"}, {"label":"Schedule conflict or full section?", "kind":"diamond"}, {"label":"Submit subject enrollment", "kind":"rect"}, {"label":"Adviser confirms list?", "kind":"diamond"}, {"label":"Approved subject-list record", "kind":"cylinder"}, {"label":"PAGE BREAK | CONTINUE TO PAGE 08", "kind":"chevron"}], side=[
        {"anchor":3, "side":"left", "y":410, "label":"No: revise subject selection", "kind":"trap", "edge":"No", "return_to":2, "return_label":"Revise"}, {"anchor":4, "side":"right", "y":300, "label":"Yes: revise selection", "kind":"trap", "edge":"Yes", "return_to":2, "return_label":"Revise"}, {"anchor":6, "side":"left", "y":205, "label":"No: apply adviser comments", "kind":"note", "edge":"No", "return_to":2, "return_label":"Update"}]),
    dict(title="PAYMENT AND ACCOUNTING", owner="Student / Accounting", input="Approved subject list", output="Confirmed payment receipt", bg=PALE_PURPLE, next="CONTINUE TO PAGE 09", nodes=[
        {"label":"RECEIVE FROM PAGE 07", "kind":"chevron"}, {"label":"Generate assessment and balance", "kind":"rect"}, {"label":"Payment method?", "kind":"diamond"}, {"label":"Online checkout", "kind":"subroutine"}, {"label":"PayMongo transaction", "kind":"cylinder"}, {"label":"Wait for payment callback", "kind":"delay"}, {"label":"Payment confirmed?", "kind":"diamond"}, {"label":"Official payment receipt", "kind":"doc"}, {"label":"PAGE BREAK | CONTINUE TO PAGE 09", "kind":"chevron"}], side=[
        {"anchor":2, "side":"left", "y":405, "label":"Walk-in: cashier and queue ticket", "kind":"input", "edge":"Walk-in"}, {"anchor":6, "side":"right", "y":275, "label":"No: show failed-payment reason", "kind":"note", "edge":"No", "return_to":2, "return_label":"Retry"}]),
    dict(title="REGISTRAR VALIDATION AND ENROLLMENT", owner="Registrar", input="Subjects plus payment", output="ENROLLED status and COR", bg=HexColor("#E8F1FF"), next="CONTINUE TO PAGE 10", nodes=[
        {"label":"RECEIVE FROM PAGE 08", "kind":"chevron"}, {"label":"Merge approved subjects and payment", "kind":"merge"}, {"label":"Final registrar validation passed?", "kind":"diamond"}, {"label":"Confirm term slot and section", "kind":"rect"}, {"label":"Registrar enrollment record", "kind":"cylinder"}, {"label":"Set status: ENROLLED", "kind":"milestone"}, {"label":"Generate Certificate of Registration", "kind":"docs"}, {"label":"Notify student and staff", "kind":"note"}, {"label":"PAGE BREAK | CONTINUE TO PAGE 10", "kind":"chevron"}], side=[
        {"anchor":2, "side":"left", "y":410, "label":"No: fix registrar exception", "kind":"trap", "edge":"No", "return_to":1, "return_label":"Correct"}]),
    dict(title="LMS DELIVERY AND ACADEMIC CYCLE", owner="LMS / Faculty / Student", input="Official enrollment", output="Audit trail and next term", bg=PALE_GRAY, next="CONTINUE TO PAGE 11", nodes=[
        {"label":"RECEIVE FROM PAGE 09", "kind":"chevron"}, {"label":"Provision LMS enrollment", "kind":"subroutine"}, {"label":"Publish classes and assignments", "kind":"rect"}, {"label":"Student submission", "kind":"output"}, {"label":"Grade and review", "kind":"rect"}, {"label":"Grade returned for revision?", "kind":"diamond"}, {"label":"Write audit log", "kind":"cylinder"}, {"label":"Update background-job state", "kind":"cylinder"}, {"label":"PAGE BREAK | CONTINUE TO PAGE 11", "kind":"chevron"}], side=[
        {"anchor":5, "side":"left", "y":315, "label":"Yes: await resubmission", "kind":"delay", "edge":"Yes", "return_to":3, "return_label":"Resubmit"}]),
    dict(title="ADMIN OPERATIONS AND TERM CLOSE", owner="Administrator", input="Term handoff", output="Rollover or finish", bg=PALE_RED, next="REFERENCE PAGE", nodes=[
        {"label":"RECEIVE TERM HANDOFF", "kind":"chevron"}, {"label":"Configure active academic term", "kind":"rect"}, {"label":"Maintain courses and sections", "kind":"subroutine"}, {"label":"Manage users and role access", "kind":"subroutine"}, {"label":"Monitor background jobs", "kind":"cylinder"}, {"label":"Operational exception?", "kind":"diamond"}, {"label":"Admin audit record", "kind":"cylinder"}, {"label":"Close term and rollover", "kind":"close"}, {"label":"FINISH", "kind":"stadium"}], side=[
        {"anchor":5, "side":"left", "y":325, "label":"Yes: run recovery or retry job", "kind":"trap", "edge":"Yes", "return_to":6, "return_label":"Audit"}]),
]


def draw_key_page(c: Canvas) -> None:
    bg = PALE_REF
    draw_header(c, 12, "SHAPE KEY AND PDF PRINT SETUP", "Reference", "Flowchart pages", "Print-ready legend", bg)
    c.setFillColor(MUTED); c.setFont("Helvetica", 8.2)
    c.drawString(MARGIN + 4, H - HEADER_H - 56, "Print each page at 100% on letter / short-bond portrait. Keep one frame per page.")
    items = [
        ("Process", "rect"), ("Rounded process", "rounded"), ("Start or end", "stadium"),
        ("Event", "circle"), ("Decision", "diamond"), ("Preparation", "hex"),
        ("Predefined process", "subroutine"), ("Database / record", "cylinder"),
        ("Manual input", "input"), ("Output", "output"), ("Manual operation", "trap"),
        ("Return / correction", "trap"), ("Continuation marker", "chevron"), ("Single document", "doc"),
        ("Document set", "docs"), ("Warning / hold", "warning"), ("Term close", "close"),
        ("Milestone", "milestone"), ("Annotation", "note"), ("Merge", "merge"), ("Wait / queue", "delay"),
    ]
    cols = 3
    cell_w = 176
    cell_h = 70
    start_x = 44
    start_y = H - HEADER_H - 82
    for idx, (label, kind) in enumerate(items):
        col = idx % cols
        row = idx // cols
        x = start_x + col * cell_w
        y = start_y - row * cell_h - 42
        draw_shape(c, x, y, 142, 36, label, kind, white)
    c.setFillColor(MUTED); c.setFont("Helvetica", 7.7)
    c.drawString(MARGIN + 4, 52, "PDF export note: select portrait, letter / short bond, fit to page, and print one page per process.")
    draw_footer(c, 12, "END OF FLOW")


def main() -> None:
    out_dir = os.path.dirname(__file__)
    out_path = os.path.join(out_dir, "NCST-enrollment-print-ready-letter.pdf")
    os.makedirs(out_dir, exist_ok=True)
    c = Canvas(out_path, pagesize=letter)
    for page_no, spec in enumerate(PAGES, 1):
        draw_flow_page(c, page_no, spec)
    draw_key_page(c)
    c.save()
    print(out_path)


if __name__ == "__main__":
    main()
