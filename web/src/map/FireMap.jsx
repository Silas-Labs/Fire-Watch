
import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'

import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'

import eastAfrica from './data/east-africa.geojson?raw'
import world from './data/world.geojson?raw'
import { useFireWatch } from '../store/useFireWatch.js'
import { getCellActivity } from '../store/selection.js'

const WORLD_VIEW = [
  [-60, -180],
  [85, 180],
]
const COUNTRY_STYLE = {
  color: '#536577',
  weight: 1,
  opacity: 0.8,
  fillColor: '#1b2936',
  fillOpacity: 0,
}

const WORLD_COUNTRY_STYLE = {
  color: '#35434d',
  weight: 0.55,
  opacity: 0.8,
  fillColor: '#17232b',
  fillOpacity: 0,
}

const TANZANIA_STYLE = {
  color: '#e19a51',
  weight: 1.8,
  opacity: 1,
  fillColor: '#344b40',
  fillOpacity: 0.08,
}

const SELECTION_STYLE = {
  color: '#f0a04b',
  weight: 2,
  opacity: 1,
  fillColor: '#f0a04b',
  fillOpacity: 0.12,
  dashArray: '6 5',
}

const FIRE_COLORS = [
  '#ffc766',
  '#ffad42',
  '#ff872e',
  '#f45b25',
  '#d93622',
]

function getCountryStyle(feature) {
  const code = feature.properties?.['ISO3166-1-Alpha-3']

  return code === 'TZA' ? TANZANIA_STYLE : COUNTRY_STYLE
}

function getFireColor(value, maximum) {
  if (value <= 0 || maximum <= 0) return null

  const intensity = value / maximum

  if (intensity <= 0.2) return FIRE_COLORS[0]
  if (intensity <= 0.4) return FIRE_COLORS[1]
  if (intensity <= 0.6) return FIRE_COLORS[2]
  if (intensity <= 0.8) return FIRE_COLORS[3]

  return FIRE_COLORS[4]
}

function FireMap() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const selectionLayerRef = useRef(null)
  const activityLayerRef = useRef(null)

  const {
    dataset,
    selection,
    setAOI,
  } = useFireWatch()

  const { aoi, source, dateRange } = selection

 
const activityCells = useMemo(() => {
  if (!dataset || !dateRange.start || !dateRange.end) {
    return []
  }

  return dataset.cells
    .filter((cell) => {
      if (!aoi) return true

      const halfGrid = dataset.meta.grid_deg / 2
      const centerLat = cell.lat + halfGrid
      const centerLon = cell.lon + halfGrid

      return (
        centerLat >= aoi.south &&
        centerLat <= aoi.north &&
        centerLon >= aoi.west &&
        centerLon <= aoi.east
      )
    })
    .map((cell) => ({
      ...cell,
      activity: getCellActivity(
        dataset,
        cell.id,
        source,
        dateRange,
      ),
    }))
}, [dataset, source, dateRange, aoi])


const hasActivity = activityCells.some(
  (cell) => cell.activity > 0,
)

  // Initialise the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
      preferCanvas: true,
      minZoom: 2,
      maxZoom: 12,
    })

    const satelliteLayer = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution:
      'Tiles © Esri — Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
  },
)

satelliteLayer.addTo(map)

    mapRef.current = map

    L.control.zoom({ position: 'topright' }).addTo(map)

L.geoJSON(JSON.parse(world), {
  style: WORLD_COUNTRY_STYLE,
}).addTo(map)

    L.geoJSON(JSON.parse(eastAfrica), {
      style: getCountryStyle,
      onEachFeature(feature, layer) {
        const code = feature.properties?.['ISO3166-1-Alpha-3']
        const name = code === 'TZA'
          ? 'TANZANIA'
          : feature.properties?.name?.toUpperCase()

        if (name) {
          layer.bindTooltip(name, {
            permanent: true,
            direction: 'center',
            className: code === 'TZA'
              ? 'firewatch-country-label firewatch-country-label-primary'
              : 'firewatch-country-label',
          })
        }
      },
    }).addTo(map)

    L.control.scale({
      position: 'bottomleft',
      metric: true,
      imperial: false,
    }).addTo(map)

    map.attributionControl.setPrefix(false)
    map.attributionControl.addAttribution(
      'Boundaries: Natural Earth / geo-countries',
    )

    map.fitBounds(WORLD_VIEW, {
      padding: [20, 20],
    })

    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polygon: false,
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        rectangle: {
          shapeOptions: {
            ...SELECTION_STYLE,
          },
        },
      },
      edit: false,
    })

    map.addControl(drawControl)

    function handleRectangleCreated(event) {
      if (event.layerType !== 'rectangle') return

      const bounds = event.layer.getBounds()

      setAOI({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    }

    map.on(L.Draw.Event.CREATED, handleRectangleCreated)

    return () => {
      map.off(L.Draw.Event.CREATED, handleRectangleCreated)
      map.remove()
      mapRef.current = null
      selectionLayerRef.current = null
      activityLayerRef.current = null
    }
  }, [setAOI])

  // Render the fire activity grid.
  useEffect(() => {
    const map = mapRef.current

    if (!map || !dataset) return

    if (activityLayerRef.current) {
      map.removeLayer(activityLayerRef.current)
    }

    const maximum = Math.max(
      0,
      ...activityCells.map((cell) => cell.activity),
    )

    const activityLayer = L.layerGroup()

    for (const cell of activityCells) {
      const color = getFireColor(cell.activity, maximum)

      if (!color) continue

      const bounds = [
        [cell.lat, cell.lon],
        [
          cell.lat + dataset.meta.grid_deg,
          cell.lon + dataset.meta.grid_deg,
        ],
      ]

      const rectangle = L.rectangle(bounds, {
        stroke: true,
        color: '#f8b45b',
        weight: 0.45,
        opacity: 0.45,
        fillColor: color,
        fillOpacity: 0.68,
        interactive: true,
      })

      rectangle.bindTooltip(
        `<strong>${cell.id}</strong><br/>` +
        `Activity: ${cell.activity.toLocaleString()}<br/>` +
        `Source: ${source.toUpperCase()}`,
      )

      rectangle.addTo(activityLayer)
    }

    activityLayer.addTo(map)
    activityLayerRef.current = activityLayer
  }, [dataset, activityCells, source])

  // Synchronise the visible AOI rectangle.
  
  // Synchronise the visible AOI rectangle and map viewport.
  useEffect(() => {
    const map = mapRef.current

    if (!map) return

    if (selectionLayerRef.current) {
      map.removeLayer(selectionLayerRef.current)
      selectionLayerRef.current = null
    }

    if (!aoi) return

    const rectangle = L.rectangle(
      [
        [aoi.south, aoi.west],
        [aoi.north, aoi.east],
      ],
      SELECTION_STYLE,
    )

    rectangle.addTo(map)
    selectionLayerRef.current = rectangle

    // Zoom into the selected area.
    map.fitBounds(rectangle.getBounds(), {
      padding: [48, 48],
      maxZoom: 8,
      animate: true,
      duration: 0.8,
    })
  }, [aoi])


 return (
  <div className="firewatch-map-shell">
    <div
      ref={containerRef}
      className="firewatch-map"
      role="application"
      aria-label="Interactive map of Tanzania and surrounding countries"
    />

    {hasActivity && (
      <aside
        className="fire-legend"
        aria-label="Relative fire activity legend"
      >
        <div className="legend-heading">
          <span className="legend-indicator" />
          <strong>FIRE ACTIVITY</strong>
        </div>

        <p>Relative intensity</p>

        <div className="legend-scale">
          {FIRE_COLORS.map((color, index) => (
            <span
              key={color}
              className="legend-swatch"
              style={{ backgroundColor: color }}
              aria-label={`Intensity level ${index + 1}`}
            />
          ))}
        </div>

        <div className="legend-labels">
          <span>LOW</span>
          <span>HIGH</span>
        </div>
      </aside>
    )}
  </div>
)
}

export default FireMap
