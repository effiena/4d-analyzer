import { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState([]);

  const fetchData = async () => {
    try {
      const res = await fetch("http://localhost:5000/results");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchData();

    // 🔄 auto refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, []);

  // 📊 frequency analysis
  const freq = {};
  data.forEach((item) => {
    freq[item.num] = (freq[item.num] || 0) + 1;
  });

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Live 4D Dashboard</h2>

      <h3>🔥 Latest Results</h3>
      {data.slice(0, 10).map((d, i) => (
        <div key={i}>
          {d.num} ({d.draw})
        </div>
      ))}

      <h3>📈 Most Frequent Numbers</h3>
      {sorted.slice(0, 10).map(([num, count]) => (
        <div key={num}>
          {num} → {count} times
        </div>
      ))}
    </div>
  );
}
