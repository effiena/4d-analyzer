import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

export default function App() {
  const [history, setHistory] = useState([]);

  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2030-01-01");
  const [searchNumber, setSearchNumber] = useState("");

  // =========================
  // FETCH
  // =========================
  const fetchHistory = async () => {
    try {
      const res = await fetch("http://localhost:5000/history");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  // =========================
  // FILTER
  // =========================
  const cleanHistory = useMemo(() => {
    return history.filter((item) => {
      if (!item.number || !item.created_at) return false;

      const itemDate = new Date(item.created_at)
        .toISOString()
        .split("T")[0];

      return (
        /^\d{4}$/.test(item.number) &&
        itemDate >= startDate &&
        itemDate <= endDate
      );
    });
  }, [history, startDate, endDate]);

  // =========================
  // FREQUENCY
  // =========================
  const freq = {};

  cleanHistory.forEach((item) => {
    freq[item.number] = (freq[item.number] || 0) + 1;
  });

  const chartData = Object.entries(freq)
    .map(([number, count]) => ({ number, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const maxFreq = Math.max(...chartData.map(d => d.count || 0), 1);

  const getBarColor = (count) => {
    if (count === maxFreq) return "#ff4d4f";
    if (count > maxFreq * 0.6) return "#faad14";
    return "#1890ff";
  };

  // =========================
  // HEATMAP DATA
  // =========================
  const heatmap = {
    pos1: {},
    pos2: {},
    pos3: {},
    pos4: {}
  };

  cleanHistory.forEach((item) => {
    const digits = item.number.split("");

    ["pos1", "pos2", "pos3", "pos4"].forEach((pos, i) => {
      const d = digits[i];
      if (!d) return;

      heatmap[pos][d] = (heatmap[pos][d] || 0) + 1;
    });
  });

  const getHeatmapData = (pos) =>
    Object.entries(heatmap[pos] || {}).map(([digit, count]) => ({
      digit,
      count
    }));

  // =========================
  // SEARCH
  // =========================
  const searchResults = useMemo(() => {
    if (searchNumber.length !== 4) return [];
    return history.filter((item) => item.number === searchNumber);
  }, [searchNumber, history]);

  // =========================
  // UI
  // =========================
  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1>📊 4D Analytics Dashboard</h1>

      {/* FILTER */}
      <div style={{ display: "flex", gap: 10 }}>
        <input type="date" value={startDate}
          onChange={(e) => setStartDate(e.target.value)} />

        <input type="date" value={endDate}
          onChange={(e) => setEndDate(e.target.value)} />

        <input
          maxLength={4}
          placeholder="Search 4D"
          value={searchNumber}
          onChange={(e) => setSearchNumber(e.target.value)}
        />
      </div>

      {/* STATS */}
      <p>📦 Total Records: {history.length}</p>
      <p>📊 Filtered Records: {cleanHistory.length}</p>

      {/* ========================= */}
      {/* FREQUENCY CHART */}
      {/* ========================= */}
      <h2>🔥 Top Numbers</h2>

      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <XAxis dataKey="number" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count">
              {chartData.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.count)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ========================= */}
      {/* 🔥 DIGIT HEATMAP (MERGED EXACTLY AS REQUESTED) */}
      {/* ========================= */}

      <h2 style={{ marginTop: 40 }}>🔥 Digit Heatmap</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20
        }}
      >
        {["pos1", "pos2", "pos3", "pos4"].map((pos) => (
          <div
            key={pos}
            style={{
              border: "1px solid #ddd",
              padding: 10,
              borderRadius: 8
            }}
          >
            <h3 style={{ marginBottom: 10 }}>
              {pos.toUpperCase()}
            </h3>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {getHeatmapData(pos).map((d, i) => (
                <div
                  key={i}
                  style={{
                    padding: "4px 8px",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    fontSize: 12
                  }}
                >
                  {d.digit} → {d.count}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ========================= */}
      {/* SEARCH RESULT */}
      {/* ========================= */}
      {searchNumber.length === 4 && (
        <div style={{ marginTop: 20 }}>
          <h3>🔍 Search Result</h3>
          <p>{searchResults.length} found</p>
        </div>
      )}
    </div>
  );
}
