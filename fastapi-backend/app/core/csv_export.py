import csv
import io

from fastapi.responses import StreamingResponse


def dict_rows_to_csv_response(sections: dict[str, list[dict]], filename: str) -> StreamingResponse:
    """Renders a {section_name: [row_dict, ...]} mapping as a single CSV, one
    '## <SectionName>' marker + header + data rows per section. In-memory
    buffering (not a true generator) is fine at this data volume — org-wide
    breakdowns and a handful of months of trends, not bulk exports."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    for name, rows in sections.items():
        writer.writerow([f"## {name}"])
        if rows:
            writer.writerow(rows[0].keys())
            for row in rows:
                writer.writerow(row.values())
        writer.writerow([])

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
