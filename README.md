# GIS_portal: Edineț

Portal WebGIS pentru orașul Edineț, realizat în Visual Studio Code cu Leaflet 1.9.4, Bootstrap 4.6.2 și jQuery 3.7.1. Se rulează local cu extensia Live Server. Stilul este întunecat, cu aceeași paletă ca proiectul QGIS și portalul din lucrarea 4.

**🌐 Online:** https://odi203.github.io/gis-portal-edinet/

## Pornire
VS Code → File → Open Folder → `GIS_portal` → click dreapta pe `index.html` → **Open with Live Server**.

## Structură
| Cale | Conținut |
|---|---|
| `index.html` | pagina: bara de navigare (meniu „Zoom la”, fereastra „Despre”), bara laterală (3 coloane) și harta (9 coloane) |
| `css/style.css` | stilul întunecat peste Bootstrap |
| `js/portal.js` | harta: fundaluri, straturi GeoJSON, pop-up-uri, control straturi, comutatoare, căutare, evenimente |
| `lib/*.js` | datele spațiale: GeoJSON salvat ca variabilă (`var cladiri = {...};`) |

## Funcții
- **Fundaluri**: Esri Dark Gray, OpenStreetMap, OpenTopoMap, Esri World Imagery (leaflet-providers), ortofotoplanul 2016 (WMS INDS).
- **12 straturi**, fiecare cu un comutator Bootstrap și o legendă. Comutatoarele sunt sincronizate cu `L.control.layers`.
- **Căutare** după nume sau tip, în servicii, transport, monumente, străzi, clădiri și spații verzi.
- **Evenimente Leaflet**:
  - `click`: atributele obiectului apar în fila „Obiect”;
  - `mousemove`: coordonatele;
  - `zoomend`: nivelul de zoom;
  - `moveend`: în fila „În vizor”, câte obiecte se văd acum pe hartă.

Datele au fost convertite din `.shp` în GeoJSON cu scriptul `../pregateste_date_portal.sh` (ogr2ogr, WGS84, 6 zecimale).

---
Groza Odi, gr. IGC-223 F/R · Coordonator: conf. univ. dr. Sîrbu Rodica
