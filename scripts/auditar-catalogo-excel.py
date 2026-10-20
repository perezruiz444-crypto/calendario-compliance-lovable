"""Comparación local de nombres/contenidos; no valida normativa ni modifica datos."""
import json
import re
import sys
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def normalize(value):
    text = "".join(c for c in unicodedata.normalize("NFKD", value) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def read_rows(path):
    with ZipFile(path) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(node.itertext()) for node in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("x:si", NS)]
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relations = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {node.get("Id"): node.get("Target") for node in relations}
        for sheet in workbook.findall("x:sheets/x:sheet", NS):
            target = targets[sheet.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")]
            member = target.lstrip("/") if target.startswith("/") else "xl/" + target
            for row in ET.fromstring(archive.read(member)).findall(".//x:row", NS):
                cells = []
                for cell in row.findall("x:c", NS):
                    value = cell.find("x:v", NS)
                    inline = cell.find("x:is", NS)
                    text = value.text if value is not None else "".join(inline.itertext()) if inline is not None else ""
                    if cell.get("t") == "s":
                        text = strings[int(text)]
                    if text:
                        cells.append({"celda": cell.get("r"), "texto": text})
                if cells:
                    yield {"archivo": str(path.relative_to(ROOT)), "hoja": sheet.get("name"), "fila": row.get("r"), "celdas": cells}


def main():
    catalogs = json.loads(Path(sys.argv[1]).read_text())
    files = sorted([*ROOT.glob("*.xlsx"), *ROOT.joinpath("Catalogo de obligaciones").glob("*.xlsx")])
    files = [path for path in files if not path.name.startswith("~$")]
    rows = [row for path in files for row in read_rows(path)]
    seed = ROOT.joinpath("supabase/migrations/20260325100002_sprint1_catalogo_seed.sql").read_text()
    templates = {normalize(name) for _, _, name in re.findall(r"\('([^']+)',\s*'([^']+)',\s*'([^']+)'", seed)}
    results = []
    for catalog in catalogs:
        name = normalize(catalog["nombre"])
        exact = [row for row in rows if any(normalize(cell["texto"]) == name for cell in row["celdas"])]
        score, best = max((
            (max(SequenceMatcher(None, name, normalize(cell["texto"])).ratio() for cell in row["celdas"]), index)
            for index, row in enumerate(rows)
        ))
        results.append({"id": catalog["id"], "programa": catalog["programa"], "nombre": catalog["nombre"],
                        "activo": catalog["activo"], "empresas_activas": catalog["empresas_activas"], "marcas": catalog["marcas"],
                        "plantilla_inicial": name in templates, "coincidencias_nombre": exact,
                        "similitud_nombre": round(score, 3), "fila_candidata": rows[best] if not exact else None,
                        "advertencia": "Coincidencia textual no acredita equivalencia, aplicabilidad, frecuencia ni sustento legal."})
    output = {"archivos": [str(path.relative_to(ROOT)) for path in files], "definiciones": results}
    Path(sys.argv[2]).write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"archivos": len(files), "definiciones": len(results),
                      "activos": sum(item["activo"] for item in results),
                      "sin_coincidencia_exacta": [{key: item[key] for key in ["programa", "nombre", "activo", "plantilla_inicial", "similitud_nombre", "empresas_activas"]}
                                                for item in results if not item["coincidencias_nombre"]]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
