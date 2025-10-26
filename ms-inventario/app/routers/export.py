from fastapi import APIRouter, Response
from app import crud
import pandas as pd
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from sqlalchemy import select, func
from app.models import Stock
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime

router = APIRouter(tags=["export"])

@router.get("/")
def export_inventario(format: str = "excel"):
    """
    Exporta el inventario actual en formato Excel o PDF con estilo.
    Uso:
      /export?format=excel
      /export?format=pdf
    """
    from app.db import SessionLocal
    db = SessionLocal()

    # Obtener productos
    productos = crud.get_productos(db)

    # Obtener stock total por producto
    stock_data = db.execute(
        select(Stock.producto_id, func.sum(Stock.cantidad)).group_by(Stock.producto_id)
    ).all()
    stock_dict = {sid: cantidad for sid, cantidad in stock_data}

    db.close()

    # Crear DataFrame limpio
    df = pd.DataFrame([{
        "SKU": p.sku,
        "Producto": (p.nombre or "").encode("latin1", "ignore").decode("utf-8", "ignore"),
        "Stock": stock_dict.get(p.id, 0)
    } for p in productos])

    # Excel
    if format == "excel":
        output = BytesIO()
        df.to_excel(output, index=False)
        headers = {"Content-Disposition": "attachment; filename=inventario.xlsx"}
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )

    # PDF
    if format == "pdf":
        buffer = BytesIO()
        pdf = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        # Intentar registrar fuente UTF-8
        try:
            pdfmetrics.registerFont(TTFont("DejaVuSans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
            font_name = "DejaVuSans"
        except Exception:
            font_name = "Helvetica"

        # Encabezado
        title_style = styles["Title"]
        title_style.fontName = font_name
        elements.append(Paragraph("Reporte de Inventario - LuxChile", title_style))
        elements.append(Spacer(1, 6))

        date_style = styles["Normal"]
        date_style.fontName = font_name
        date = datetime.now().strftime("%d/%m/%Y %H:%M")
        elements.append(Paragraph(f"Generado el {date}", date_style))
        elements.append(Spacer(1, 12))

        # Subtítulo
        subtitle_style = styles["Normal"]
        subtitle_style.fontName = font_name
        subtitle_style.backColor = colors.whitesmoke
        elements.append(Paragraph("Listado de productos y existencias actuales.", subtitle_style))
        elements.append(Spacer(1, 20))

        # Construcción de tabla
        data = [["SKU", "Producto", "Stock"]]
        for p in productos:
            nombre_limpio = (p.nombre or "").encode("latin1", "ignore").decode("utf-8", "ignore")
            data.append([p.sku, nombre_limpio, str(stock_dict.get(p.id, 0))])

        table = Table(data, colWidths=[100, 300, 80])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003366")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), font_name),
            ("FONTNAME", (0, 1), (-1, -1), font_name),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
            ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))

        elements.append(table)
        pdf.build(elements)

        buffer.seek(0)
        headers = {"Content-Disposition": "attachment; filename=inventario.pdf"}
        return Response(content=buffer.getvalue(), media_type="application/pdf", headers=headers)
