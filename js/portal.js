// GIS_portal Edineț — Leaflet + Bootstrap 4.6.2 + jQuery (stil întunecat)
// Datele (variabilele aoi, corine, cladiri, drumuri, poi, ...) sunt încărcate din ./lib/*.js

// ---------------------------------------------------------------------------
// 1. Harta
// ---------------------------------------------------------------------------
var canvas = L.canvas({ padding: 0.5 });   // un singur canvas: randare rapidă pentru cele ~6 300 de clădiri
var map = L.map('map', { renderer: canvas, zoomControl: true }).setView([48.170, 27.308], 14);
L.control.scale({ imperial: false }).addTo(map);

// ---------------------------------------------------------------------------
// 2. Hărți de fundal (tile layer + WMS)
// ---------------------------------------------------------------------------
var esriAttr = '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
var esriDark = L.layerGroup([
  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
              { maxNativeZoom: 16, maxZoom: 20, attribution: esriAttr }),
  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
              { maxNativeZoom: 16, maxZoom: 16 })
]).addTo(map);

var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});
// din Leaflet providers (https://leaflet-extras.github.io/leaflet-providers/preview/)
var esriImagery = L.tileLayer.provider('Esri.WorldImagery');
var openTopo = L.tileLayer.provider('OpenTopoMap');

// serviciu WMS al INDS (GeoServer geodata.gov.md): ortofotoplanul 2016 — acoperă și nordul țării
var ortofoto2016 = L.tileLayer.wms('https://geodata.gov.md/geoserver/orthophoto/wms?', {
  layers: 'orthophoto:Ortofoto_2016_RM', format: 'image/jpeg', version: '1.1.1',
  maxZoom: 20, attribution: 'Ortofotoplan 2016 &copy; <a href="https://geodata.gov.md">INDS / ASP</a>'
});

var baseMaps = {
  'Esri Dark Gray (întunecat)': esriDark,
  'OpenStreetMap': osm,
  'OpenTopoMap (relief)': openTopo,
  'Esri World Imagery': esriImagery,
  'Ortofotoplan 2016 (WMS INDS)': ortofoto2016
};

// ---------------------------------------------------------------------------
// 3. Clasificări și culori (aceeași paletă ca în QGIS și în portalul din lucrarea 4)
// ---------------------------------------------------------------------------
var CORINE = {
  112: ['Țesut urban discontinuu', '#7a3b5c'], 121: ['Unități industriale / comerciale', '#7b4fd6'],
  141: ['Zone verzi urbane', '#2f9e5f'], 211: ['Teren arabil', '#8c7a2e'], 222: ['Livezi', '#a0662b'],
  231: ['Pășuni', '#5f8c2e'], 242: ['Culturi complexe', '#7a7a2a'], 311: ['Pădure de foioase', '#1e7a46'],
  512: ['Ape stătătoare', '#2a6fd6']
};
var CLADIRI = {
  'Locuințe individuale': '#5d6b82', 'Locuințe colective': '#7c6cf2', 'Instituții publice': '#ff5c8a',
  'Comerț și servicii': '#ffb547', 'Industrie și garaje': '#8a6d5a'
};
var DRUMURI = {   // tip: [denumire, culoare, grosime, linie întreruptă]
  trunk: ['Drum magistral', '#ff7a45', 5], secondary: ['Drum republican', '#ffb547', 4], secondary_link: ['Bretea', '#ffb547', 3],
  tertiary: ['Stradă principală', '#ffd88a', 3], residential: ['Stradă', '#8b95a7', 1.8], unclassified: ['Drum neclasificat', '#8b95a7', 1.8],
  living_street: ['Zonă pietonală', '#8b95a7', 1.8], service: ['Drum de serviciu', '#5c6577', 1.2],
  track: ['Drum de câmp', '#8a7550', 1.3, '5 4'], footway: ['Trotuar / alee', '#6f7b8f', 1, '1 4'],
  path: ['Potecă', '#6f7b8f', 1, '1 4'], proposed: ['Drum proiectat', '#4a5263', 1.3, '5 4']
};
var POI = {
  'Educație': '#4cc9f0', 'Sănătate': '#ff4d6d', 'Alimentație publică': '#f9844a', 'Servicii financiare': '#90be6d',
  'Administrație, cult și cultură': '#c77dff', 'Comerț': '#ffd166', 'Turism': '#06d6a0', 'Alte servicii': '#adb5bd'
};
var TR = {   // traducerea valorilor OSM folosite în pop-up-uri
  yes: 'clădire', house: 'casă', apartments: 'bloc', school: 'școală', kindergarten: 'grădiniță', hospital: 'spital',
  commercial: 'comercial', garages: 'garaje', garage: 'garaj', industrial: 'industrial', supermarket: 'supermarket',
  office: 'birouri', roof: 'șopron', terrace: 'case înșiruite', fuel: 'stație de alimentare', station: 'autogară',
  substation: 'post de transformare', line: 'înaltă tensiune', minor_line: 'joasă tensiune', stream: 'pârâu',
  ditch: 'șanț / canal', water: 'apă', lake: 'lac', park: 'parc', stadium: 'stadion', pitch: 'teren de sport',
  playground: 'loc de joacă', monument: 'monument', memorial: 'monument comemorativ', bank: 'bancă', atm: 'bancomat',
  pharmacy: 'farmacie', clinic: 'centru medical', cafe: 'cafenea', restaurant: 'restaurant', bar: 'bar',
  place_of_worship: 'lăcaș de cult', museum: 'muzeu', townhall: 'primărie', police: 'poliție', post_office: 'poștă',
  marketplace: 'piață', convenience: 'magazin alimentar', clothes: 'haine', hardware: 'materiale de construcții'
};
function tr(v) { return v == null ? '' : (TR[v] || String(v).replace(/_/g, ' ')); }

// ---------------------------------------------------------------------------
// 4. Straturile GeoJSON (L.geoJSON) cu stiluri și pop-up-uri
// ---------------------------------------------------------------------------
var selectat = null;   // obiectul evidențiat la click

function punct(culoare, raza) {
  return function (f, ll) {
    return L.circleMarker(ll, { radius: raza || 6, color: '#0e1117', weight: 1.5, fillColor: culoare(f.properties), fillOpacity: 1 });
  };
}

function laClick(numeStrat, titlu) {
  return function (f, layer) {
    layer.bindPopup('<b>' + titlu(f.properties) + '</b><br><span style="color:#9aa5b5">' + numeStrat + '</span>');
    layer.on('click', function () { arataInfo(numeStrat, titlu(f.properties), f.properties, layer); });
  };
}

var lyrAoi = L.geoJSON(aoi, {
  style: { color: '#00e5ff', weight: 3, fill: false }, interactive: false
}).addTo(map);
lyrAoi.eachLayer(function (l) { if (l._path) l._path.classList.add('glow'); });

var lyrCorine = L.geoJSON(corine, {
  style: function (f) { return { color: '#0e1117', weight: 1, fillColor: (CORINE[f.properties.cod] || ['', '#555'])[1], fillOpacity: 0.7 }; },
  onEachFeature: laClick('CORINE Land Cover', function (p) { return (CORINE[p.cod] || [p.clasa_en])[0]; })
});

var lyrApaPol = L.geoJSON(apa_pol, {
  style: { color: '#3fa9ff', weight: 1.2, fillColor: '#123f6b', fillOpacity: 0.9 },
  onEachFeature: laClick('Suprafețe de apă', function (p) { return p.nume || 'Suprafață de apă'; })
}).addTo(map);
var lyrApaLin = L.geoJSON(apa_lin, {
  style: function (f) { return { color: '#3fa9ff', weight: f.properties.tip === 'ditch' ? 1.2 : 2, dashArray: f.properties.tip === 'ditch' ? '4 3' : null }; },
  onEachFeature: laClick('Pâraie și canale', function (p) { return p.nume || tr(p.tip); })
}).addTo(map);

var lyrAgrement = L.geoJSON(agrement_pol, {
  style: { color: '#52b788', weight: 1, fillColor: '#1f6f43', fillOpacity: 0.75 },
  onEachFeature: laClick('Spații verzi și de agrement', function (p) { return p.nume || tr(p.tip); })
}).addTo(map);

var lyrCladiri = L.geoJSON(cladiri, {
  style: function (f) { var c = CLADIRI[f.properties.clasa] || '#5d6b82'; return { color: c, weight: 0.6, fillColor: c, fillOpacity: 0.85 }; },
  onEachFeature: laClick('Clădiri', function (p) { return p.nume || p.clasa; })
}).addTo(map);

var lyrDrumuri = L.geoJSON(drumuri, {
  style: function (f) { var d = DRUMURI[f.properties.tip] || ['', '#6f7b8f', 1]; return { color: d[1], weight: d[2], dashArray: d[3] || null }; },
  onEachFeature: laClick('Drumuri', function (p) { return p.nume || (DRUMURI[p.tip] || [tr(p.tip)])[0]; })
}).addTo(map);

var lyrElectric = L.geoJSON(electric_lin, {
  style: function (f) { return { color: f.properties.tip === 'line' ? '#ffd60a' : '#b39b2a', weight: f.properties.tip === 'line' ? 2.4 : 1.3, dashArray: '6 4' }; },
  onEachFeature: laClick('Linii electrice', function (p) { return 'Linie de ' + tr(p.tip); })
});
var lyrPosturi = L.geoJSON(posturi, {
  pointToLayer: punct(function () { return '#ffd60a'; }, 5),
  onEachFeature: laClick('Posturi de transformare', function () { return 'Post de transformare'; })
});

var lyrTransport = L.geoJSON(transport, {
  pointToLayer: punct(function (p) { return p.tip === 'station' ? '#00f5d4' : '#f72585'; }, 7),
  onEachFeature: laClick('Transport', function (p) { return p.nume || tr(p.tip); })
}).addTo(map);
var lyrPoi = L.geoJSON(poi, {
  pointToLayer: punct(function (p) { return POI[p.clasa] || '#adb5bd'; }, 6),
  onEachFeature: laClick('Puncte de interes', function (p) { return p.nume || tr(p.tip); })
}).addTo(map);
var lyrIstoric = L.geoJSON(istoric, {
  pointToLayer: punct(function () { return '#ff9f1c'; }, 8),
  onEachFeature: laClick('Monumente', function (p) { return p.nume || tr(p.tip); })
}).addTo(map);

map.fitBounds(lyrAoi.getBounds(), { padding: [10, 10] });

// ---------------------------------------------------------------------------
// 5. Controlul straturilor (L.control.layers)
// ---------------------------------------------------------------------------
var STRATURI = [   // id, denumire, strat, legendă
  ['aoi', 'Limita orașului', lyrAoi, [['#00e5ff', 'Limita orașului Edineț', 'lin']]],
  ['istoric', 'Monumente', lyrIstoric, [['#ff9f1c', 'Monument', 'pct']]],
  ['poi', 'Puncte de interes', lyrPoi, Object.keys(POI).map(function (k) { return [POI[k], k, 'pct']; })],
  ['transport', 'Transport', lyrTransport, [['#00f5d4', 'Autogară', 'pct'], ['#f72585', 'Stație de alimentare', 'pct']]],
  ['drumuri', 'Drumuri', lyrDrumuri, ['trunk', 'secondary', 'tertiary', 'residential', 'service', 'track', 'footway'].map(function (k) { return [DRUMURI[k][1], DRUMURI[k][0], 'lin']; })],
  ['electric', 'Linii electrice', lyrElectric, [['#ffd60a', 'Înaltă tensiune', 'lin'], ['#b39b2a', 'Joasă tensiune', 'lin']]],
  ['posturi', 'Posturi de transformare', lyrPosturi, [['#ffd60a', 'Post de transformare', 'pct']]],
  ['cladiri', 'Clădiri', lyrCladiri, Object.keys(CLADIRI).map(function (k) { return [CLADIRI[k], k]; })],
  ['agrement', 'Spații verzi', lyrAgrement, [['#1f6f43', 'Parcuri, stadion, terenuri de sport']]],
  ['apa', 'Ape', L.layerGroup([lyrApaPol, lyrApaLin]), [['#123f6b', 'Lacuri și iazuri'], ['#3fa9ff', 'Pâraie și canale', 'lin']]],
  ['corine', 'CORINE Land Cover', lyrCorine, Object.keys(CORINE).map(function (k) { return [CORINE[k][1], CORINE[k][0]]; })]
];
// grupul „ape” trebuie să fie pe hartă dacă sunt componentele lui
STRATURI[9][2].addTo(map);

var overlays = {};
STRATURI.forEach(function (s) { overlays[s[1]] = s[2]; });
var ctrl = L.control.layers(baseMaps, overlays, { collapsed: true }).addTo(map);

// ---------------------------------------------------------------------------
// 6. Comutatoarele din bara laterală (Bootstrap custom-switch + jQuery)
// ---------------------------------------------------------------------------
function numar(strat) { var n = 0; strat.eachLayer(function (l) { n += l.getLayers ? l.getLayers().length : 1; }); return n; }

STRATURI.forEach(function (s) {
  var id = 'sw-' + s[0];
  var leg = s[3].map(function (x) {
    return '<div><i class="' + (x[2] || '') + '" style="background:' + x[0] + ';color:' + x[0] + '"></i>' + x[1] + '</div>';
  }).join('');
  $('#lista-straturi').append(
    '<div class="strat"><div class="custom-control custom-switch">' +
      '<input type="checkbox" class="custom-control-input" id="' + id + '"' + (map.hasLayer(s[2]) ? ' checked' : '') + '>' +
      '<label class="custom-control-label" for="' + id + '">' + s[1] + '</label><span class="nr">' + numar(s[2]).toLocaleString('ro-RO') + '</span>' +
    '</div><div class="legenda">' + leg + '</div></div>');
  $('#' + id).on('change', function () {
    if (this.checked) map.addLayer(s[2]); else map.removeLayer(s[2]);
  });
});
// controlul Leaflet și comutatoarele rămân sincronizate
map.on('overlayadd overlayremove', function (e) {
  STRATURI.forEach(function (s) { if (s[2] === e.layer) $('#sw-' + s[0]).prop('checked', e.type === 'overlayadd'); });
});

// ---------------------------------------------------------------------------
// 7. Căutare (puncte de interes, transport, monumente, străzi, clădiri cu nume)
// ---------------------------------------------------------------------------
var index = [];
[[lyrPoi, 'Punct de interes'], [lyrTransport, 'Transport'], [lyrIstoric, 'Monument'], [lyrDrumuri, 'Stradă'],
 [lyrCladiri, 'Clădire'], [lyrAgrement, 'Spațiu verde']].forEach(function (x) {
  x[0].eachLayer(function (l) {
    var p = l.feature.properties, nume = p.nume || '';
    if (!nume && x[1] !== 'Punct de interes') return;
    index.push({ l: l, strat: x[0], nume: nume || tr(p.tip), tip: x[1] + (p.tip ? ' · ' + tr(p.tip) : ''),
                 text: (nume + ' ' + tr(p.tip) + ' ' + (p.clasa || '') + ' ' + (p.strada || '')).toLowerCase() });
  });
});
// străzile au multe segmente cu același nume: păstrăm unul singur
var vazute = {};
index = index.filter(function (o) { var k = o.tip.split(' ·')[0] + o.nume; if (o.tip.indexOf('Stradă') === 0) { if (vazute[k]) return false; vazute[k] = 1; } return true; });

$('#cautare').on('input', function () {
  var q = $(this).val().trim().toLowerCase();
  $('#rezultate').empty();
  if (q.length < 2) return;
  index.filter(function (o) { return o.text.indexOf(q) >= 0; }).slice(0, 12).forEach(function (o) {
    $('<a class="list-group-item list-group-item-action">' + o.nume + '<small>' + o.tip + '</small></a>')
      .on('click', function () {
        if (!map.hasLayer(o.strat)) map.addLayer(o.strat);
        if (o.l.getLatLng) map.setView(o.l.getLatLng(), 18); else map.fitBounds(o.l.getBounds(), { maxZoom: 18 });
        o.l.fire('click'); o.l.openPopup();
        $('#rezultate').empty();
      })
      .appendTo('#rezultate');
  });
});

// ---------------------------------------------------------------------------
// 8. Evenimente: click (atribute), mousemove (coordonate), zoomend, moveend (statistici)
// ---------------------------------------------------------------------------
var ETICHETE = { clasa: 'Clasa', tip: 'Tip', nume: 'Nume', etaje: 'Etaje', strada: 'Strada', nr: 'Nr.', functie: 'Funcție',
  m2: 'Suprafață (m²)', ha: 'Suprafață (ha)', km: 'Lungime (km)', suprafata: 'Îmbrăcăminte', tensiune: 'Tensiune (V)',
  operator: 'Operator', program: 'Program', tel: 'Telefon', web: 'Site', sport: 'Sport', subtip: 'Detaliu', cod: 'Cod CLC',
  clasa_en: 'Clasa (EN)', temporar: 'Temporar', categorie: 'Categorie' };

function arataInfo(numeStrat, titlu, p, layer) {
  if (selectat && selectat.setStyle) selectat.setStyle(selectat._stilVechi);
  if (layer.setStyle) {
    layer._stilVechi = { color: layer.options.color, weight: layer.options.weight };
    layer.setStyle({ color: '#ffffff', weight: (layer.options.weight || 1) + 2 });
    selectat = layer;
  }
  var rows = Object.keys(p).filter(function (k) { return p[k] !== null && p[k] !== ''; }).map(function (k) {
    var v = p[k];
    if (k === 'tip' || k === 'functie' || k === 'sport' || k === 'suprafata' || k === 'subtip') v = tr(v);
    if (k === 'web') v = '<a href="' + v + '" target="_blank" rel="noopener">' + String(v).replace(/^https?:\/\//, '') + '</a>';
    return '<tr><th>' + (ETICHETE[k] || k) + '</th><td>' + v + '</td></tr>';
  }).join('');
  $('#info').html('<div class="info-strat">' + numeStrat + '</div><div class="info-titlu">' + titlu + '</div>' +
                  '<table class="atribute">' + rows + '</table>');
  $('#tab-info-link').tab('show');
}

map.on('mousemove', function (e) {
  $('#coordonate').text('Lat ' + e.latlng.lat.toFixed(5) + '°  ·  Lon ' + e.latlng.lng.toFixed(5) + '°');
});
map.on('zoomend', function () { $('#zoom-info').text('zoom ' + map.getZoom()); });

function statistici() {
  var b = map.getBounds(), html = '';
  [['Clădiri', lyrCladiri], ['Puncte de interes', lyrPoi], ['Segmente de drum', lyrDrumuri], ['Posturi de transformare', lyrPosturi],
   ['Suprafețe de apă', lyrApaPol], ['Monumente', lyrIstoric]].forEach(function (x) {
    var n = 0;
    x[1].eachLayer(function (l) { var ll = l.getLatLng ? l.getLatLng() : l.getBounds().getCenter(); if (b.contains(ll)) n++; });
    html += '<div class="stat"><span>' + x[0] + '</span><b>' + n.toLocaleString('ro-RO') + '</b></div>';
  });
  $('#statistici').html(html);
}
map.on('moveend', statistici);
statistici();

// ---------------------------------------------------------------------------
// 9. Navigare (meniul „Zoom la”)
// ---------------------------------------------------------------------------
$('.zoom-la').on('click', function (e) {
  e.preventDefault();
  var ll = $(this).data('ll');
  if (ll === 'aoi') map.fitBounds(lyrAoi.getBounds());
  else map.setView(String(ll).split(',').map(Number), $(this).data('z'));
});
$('#btn-acasa').on('click', function (e) { e.preventDefault(); map.fitBounds(lyrAoi.getBounds()); });
