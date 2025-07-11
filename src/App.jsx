import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import data from "./territorios.json";

const getEstado = (id) => {
  const stored = localStorage.getItem("territorio_" + id);
  return stored ? JSON.parse(stored) : { estado: "pendiente" };
};

const setEstado = (id, info) => {
  localStorage.setItem("territorio_" + id, JSON.stringify(info));
};

const App = () => {
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    const updated = data.features.map((f, i) => {
      const estadoObj = getEstado(i);
      return {
        ...f,
        properties: {
          ...f.properties,
          id: i,
          ...estadoObj,
        },
      };
    });
    setFeatures(updated);
  }, []);

  const handleClick = (feature, layer) => {
    const id = feature.properties.id;
    const estadoActual = feature.properties.estado || "pendiente";
    const nuevo = { ...getEstado(id) };

    if (estadoActual === "pendiente") {
      const persona = prompt("¿Quién va a iniciar este territorio?");
      if (!persona) return;
      nuevo.estado = "en_proceso";
      nuevo.persona = persona;
      nuevo.fecha_inicio = new Date().toISOString();
    } else if (estadoActual === "en_proceso") {
      nuevo.estado = "terminado";
      nuevo.fecha_final = new Date().toISOString();
    } else if (estadoActual === "terminado") {
      nuevo.estado = "pendiente";
      delete nuevo.persona;
      delete nuevo.fecha_inicio;
      delete nuevo.fecha_final;
    }

    setEstado(id, nuevo);

// Actualiza el objeto real que Leaflet ya está pintando
    feature.properties = {
      ...feature.properties,
      ...nuevo, // incluye estado actualizado
    };
    layer.setStyle(style(feature));

    // Actualizar solo los properties del estado en memoria
    setFeatures((prev) =>
      prev.map((f) =>
        f.properties.id === id
          ? {
              ...f,
              properties: {
                ...f.properties,
                ...nuevo,
              },
            }
          : f
      )
    );
  };

  const onEachFeature = (feature, layer) => {
    layer.on("click", () => handleClick(feature, layer));
    layer.bindPopup("Territorio #" + (feature.properties.id + 1));
  };

  const style = (feature) => {
    const estado = feature.properties.estado;
    let color = "green";
    if (estado === "en_proceso") color = "yellow";
    if (estado === "terminado") color = "red";
    return {
      fillColor: color,
      weight: 2,
      opacity: 1,
      color: "black",
      fillOpacity: 0.6,
    };
  };

  const exportarExcel = () => {
    const rows = features
      .filter((f) => f.properties.estado !== "pendiente")
      .map((f) => ({
        Territorio: f.properties.id + 1,
        Estado:
          f.properties.estado === "en_proceso" ? "En proceso" : "Terminado",
        Persona: f.properties.persona || "",
        Fecha_Inicio: f.properties.fecha_inicio || "",
        Fecha_Finalización: f.properties.fecha_final || "",
      }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Territorios");
    XLSX.writeFile(wb, "estado_territorios.xlsx");
  };

  return (
    <>
      <button onClick={exportarExcel} style={{ position: "absolute", zIndex: 1000, margin: 10 }}>
        Exportar Excel
      </button>
      <MapContainer center={[6.24, -75.57]} zoom={13} style={{ height: "100vh", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {features.length > 0 && (
          <GeoJSON data={features} style={style} onEachFeature={onEachFeature} />
        )}
      </MapContainer>
    </>
  );
};

export default App;
